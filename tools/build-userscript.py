#!/usr/bin/env python3
"""
把 Chrome 扩展的源码打成一个油猴（Tampermonkey）脚本。

    python3 tools/build-userscript.py                       # 只出文件，不带自动更新
    python3 tools/build-userscript.py --host http://1.2.3.4/yxwt   # 带自动更新

产物：yunxiao-worklog.user.js（固定名，版本号写在脚本头的 @version 里）

文件名刻意用 ASCII 且不带版本号：@updateURL 必须是个固定 URL，油猴靠它拉新版；
中文名进 raw URL 会被百分号编码，多一层出错的可能。

设计：src/ 下的业务代码**一行都不改**，两个版本共用。差异全部由三样东西吸收——
  src/gm-shim.js         把 GM_* 伪造成 chrome.*
  src/userscript-boot.js 补上 background.js 和独立设置页的活
  本脚本                 拼装、包 IIFE、把设置页塞进去

所有模块被包进一个 IIFE，chrome 作为形参传入，所以网页自己的 window.chrome 不受影响。
"""
import argparse
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OUT_NAME = 'yunxiao-worklog.user.js'

# 顺序即依赖顺序，跟 manifest.json 的 content_scripts 保持一致（gm-shim 必须最先，
# 因为 store.js 一加载就会去摸 chrome.storage）
MODULES = [
    'src/gm-shim.js',
    'src/util.js',
    'src/store.js',
    'src/api.js',
    'src/detect.js',
    'src/stats.js',
    'src/ui.js',
    'src/panel.js',
    'src/summarybar.js',
    'src/userscript-boot.js',
    'src/content.js',
]

GRANTS = [
    'GM_setValue',
    'GM_getValue',
    'GM_addValueChangeListener',
    'GM_registerMenuCommand',
]


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def js_string(text):
    """把任意文本变成安全的 JS 字符串字面量。</script> 必须打断，否则会提前结束脚本块。"""
    return json.dumps(text, ensure_ascii=False).replace('</', '<\\/')


def options_html():
    """取 options.html 的 <style> 和 <body>，去掉它自己的 <script>（改由 __optionsApp 注入）。"""
    raw = read('options.html')
    style = re.search(r'<style>(.*?)</style>', raw, re.S)
    body = re.search(r'<body>(.*?)</body>', raw, re.S)
    if not style or not body:
        raise SystemExit('options.html 结构变了，取不到 <style> / <body>')
    inner = re.sub(r'<script\b[^>]*>.*?</script>', '', body.group(1), flags=re.S)
    return (
        '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
        '<title>云效工时统计 · 设置</title><style>' + style.group(1) + '</style></head>'
        '<body>' + inner + '</body></html>'
    )


def options_app():
    """
    把 options.js 包成一个工厂：__optionsApp(window, document)。

    原文是 `(function () { ... })()`，靠全局 window/document 跑。改成显式收两个形参之后，
    同一份代码就能跑在 iframe 的文档上，业务逻辑一个字不用动。
    """
    src = read('options.js')
    head = re.match(r'^(.*?)\(function \(\) \{', src, re.S)
    if not head:
        raise SystemExit('options.js 的 IIFE 头部变了，包不出工厂函数')
    body = src[head.end():]
    tail = body.rstrip()
    if not tail.endswith('})();'):
        raise SystemExit('options.js 的 IIFE 尾部变了，包不出工厂函数')
    body = tail[:-len('})();')]
    return (
        '  // ---- options.js（原文照搬，只把 window / document 从全局改成形参）----\n'
        '  window.YXWT.__optionsApp = function (window, document) {\n'
        + body +
        '\n  };\n'
    )


def build(host):
    manifest = json.loads(read('manifest.json'))
    version = manifest['version']

    meta = [
        '// ==UserScript==',
        '// @name         %s' % manifest['name'],
        '// @namespace    https://devops.aliyun.com/',
        '// @version      %s' % version,
        '// @description  %s' % manifest['description'],
        '// @author       王建涛',
        '// @match        https://devops.aliyun.com/*',
        '// @run-at       document-idle',
        '// @noframes',
    ]
    meta += ['// @grant        %s' % g for g in GRANTS]
    if host:
        base = host.rstrip('/')
        meta += [
            '// @updateURL    %s/%s' % (base, OUT_NAME),
            '// @downloadURL  %s/%s' % (base, OUT_NAME),
        ]
    meta.append('// ==/UserScript==')

    parts = [
        '\n'.join(meta),
        '',
        '/* 由 tools/build-userscript.py 从 Chrome 扩展源码生成，请勿直接编辑。',
        '   改代码请改 src/ 下的文件，然后重新跑一次构建。 */',
        '',
        '(function (chrome) {',
        "  'use strict';",
        '',
        '  window.YXWT = window.YXWT || {};',
        '  window.YXWT.__version = %s;' % js_string(version),
        '  window.YXWT.__optionsHtml = %s;' % js_string(options_html()),
        '',
        options_app(),
    ]

    for rel in MODULES:
        parts.append('  /* ================= %s ================= */' % rel)
        parts.append(read(rel))
        parts.append('')

    # chrome 形参在这里绑定：gm-shim 已经在上面的模块里把 __chromeShim 挂好了，
    # 但形参必须在 IIFE 调用时就有值 —— 所以传一个惰性代理，取属性时才去拿真身。
    parts.append('})(new Proxy({}, {')
    parts.append('  get: function (_t, key) {')
    parts.append('    const shim = window.YXWT && window.YXWT.__chromeShim;')
    parts.append('    return shim ? shim[key] : undefined;')
    parts.append('  },')
    parts.append('  has: function (_t, key) {')
    parts.append('    const shim = window.YXWT && window.YXWT.__chromeShim;')
    parts.append('    return !!shim && key in shim;')
    parts.append('  }')
    parts.append('}));')
    parts.append('')

    out = os.path.join(ROOT, OUT_NAME)
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))

    size = os.path.getsize(out) / 1024
    print('%s  (%.1f KB)' % (os.path.basename(out), size))
    print('  版本 %s · %d 个模块' % (version, len(MODULES)))
    if host:
        print('  自动更新已开启：%s' % host.rstrip('/'))
    else:
        print('  ⚠ 没带 --host，脚本不会自动更新。想要自动更新就重跑：')
        print('    python3 tools/build-userscript.py --host http://你的服务器/路径')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--host', default='', help='脚本的托管地址前缀，用于生成 @updateURL / @downloadURL')
    build(ap.parse_args().host)


if __name__ == '__main__':
    main()

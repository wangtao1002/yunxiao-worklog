#!/usr/bin/env python3
"""
打发布 zip。用法：python3 tools/pack.py

产出两个包（版本号从 manifest.json 读，不用手填）：
  云效工时统计-vX.Y.Z-商店上传.zip   —— 文件在包根，传 Chrome 应用商店
  云效工时统计-vX.Y.Z-同事安装.zip   —— 「云效工时统计/」文件夹 + 安装说明.txt

为什么不用命令行 `zip`：macOS 自带的 Info-ZIP 不写 UTF-8 文件名标志位（flag bit 11），
中文文件夹名在 Windows 自带解压里会变成乱码，同事按说明书就找不到「云效工时统计」这个文件夹。
Python 的 zipfile 对非 ASCII 文件名会自动置位，所以这里一律走 Python。
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDER = '云效工时统计'
README_TXT = '安装说明.txt'

# 打进包的插件本体。docs / tools / README / PRIVACY / 预览页都不进包。
FILES = ['manifest.json', 'background.js', 'options.html', 'options.js']
DIRS = ['src', 'icons']


def collect():
    out = list(FILES)
    for d in DIRS:
        for name in sorted(os.listdir(os.path.join(ROOT, d))):
            if name.startswith('.'):          # .DS_Store 之类不进包
                continue
            out.append(d + '/' + name)
    return out


def for_windows(data):
    """给 Windows 记事本用的文本：UTF-8 BOM + CRLF。老版本记事本没 BOM 会把中文显示成乱码。"""
    text = data.decode('utf-8').replace('\r\n', '\n').replace('\n', '\r\n')
    return b'\xef\xbb\xbf' + text.encode('utf-8')


def write_zip(path, entries):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for arcname, data in entries:
            # 固定时间戳，同样的源码打出来的包字节一致，方便核对是不是同一版
            info = zipfile.ZipInfo(arcname, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            # 高 16 位是 Unix mode，必须带上 S_IFREG(0o100000) 这个「普通文件」类型位。
            # 只写 0o644 的话文件类型是「未知」，Windows 的解压工具可能跳过或解出异常条目，
            # Chrome 就会报「清单文件缺失或不可读」装不上（踩过一次）。
            info.external_attr = 0o100644 << 16
            z.writestr(info, data)
    return path


def main():
    with open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8') as f:
        version = json.load(f)['version']

    payload = [(rel, open(os.path.join(ROOT, rel), 'rb').read()) for rel in collect()]

    store = os.path.join(ROOT, '云效工时统计-v%s-商店上传.zip' % version)
    write_zip(store, payload)

    team_entries = [(FOLDER + '/' + rel, data) for rel, data in payload]
    team_entries.append((README_TXT, for_windows(open(os.path.join(ROOT, README_TXT), 'rb').read())))
    team = os.path.join(ROOT, '云效工时统计-v%s-同事安装.zip' % version)
    write_zip(team, team_entries)

    for p in (store, team):
        with zipfile.ZipFile(p) as z:
            bad = [i.filename for i in z.infolist() if not i.flag_bits & 0x800 and not i.filename.isascii()]
            assert not bad, '文件名缺 UTF-8 标志位，Windows 会乱码：%s' % bad
            noreg = [i.filename for i in z.infolist() if not (i.external_attr >> 16) & 0o100000]
            assert not noreg, '条目缺 S_IFREG 文件类型位，Windows 可能解压不出来：%s' % noreg
            assert 'manifest.json' in [i.filename.split('/')[-1] for i in z.infolist()], '包里没有 manifest.json'
            assert z.testzip() is None
        print('%s  (%d 个文件, %.1f KB)' % (os.path.basename(p), len(zipfile.ZipFile(p).infolist()),
                                            os.path.getsize(p) / 1024))
    print('版本 %s · 文件名 UTF-8 标志位已置位（Windows 解压不乱码）' % version)


if __name__ == '__main__':
    main()

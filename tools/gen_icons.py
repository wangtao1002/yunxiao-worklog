#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成「云效工时统计」插件图标：icons/icon16.png / 32 / 48 / 128。

设计：圆角方形底 + 深蓝→青斜向渐变，白色「柱状图 + 时钟」组合图形
（三根递增柱子在左下，右上一个带指针的表盘）。

实现要点：
- 全部用 PIL 几何绘制，不依赖任何外部字体或素材，可离线重跑。
- 每个尺寸都在 8 倍超采样画布上绘制后再 LANCZOS 下采样，边缘自带抗锯齿。
- 小尺寸（16/32）不是简单缩放：柱子更宽、表盘更大、指针更粗，
  且表盘与柱子之间留一圈"背景色间隙"（halo），避免小像素下糊成一坨。

用法：python3 tools/gen_icons.py [--preview]
"""

import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'icons')

# 渐变端点：深蓝 → 青
GRAD_FROM = (17, 56, 140)
GRAD_TO = (26, 205, 214)

# 超采样倍数
SS = 8

# 基准参数（坐标均为画布边长的比例，y 轴向下）
BASE = {
    'pad': 0.02,        # 圆角方形外边距
    'radius': 0.235,    # 圆角半径（相对圆角方形自身边长）
    'x0': 0.10,         # 第一根柱子左边缘
    'bar_w': 0.125,     # 柱宽
    'gap': 0.040,       # 柱间距
    'base_y': 0.845,    # 柱子底边
    'tops': (0.615, 0.500, 0.385),   # 三根柱子的顶边（递增）
    'cx': 0.735,        # 表盘圆心
    'cy': 0.275,
    'r': 0.175,         # 表盘半径
    'halo': 0.030,      # 表盘外圈留白间隙（从柱子上挖掉，保证两者分离）
    'hand_w': 0.042,    # 指针粗细
    'min_len': 0.115,   # 分针长度（指向 12 点）
    'hour_len': 0.082,  # 时针长度
    'hour_deg': 62.0,   # 时针角度（自 12 点顺时针）
}

# 各尺寸覆盖项：越小的图标，笔画越粗、细节越少
SPECS = {
    128: {},
    48: {'bar_w': 0.130, 'hand_w': 0.052, 'halo': 0.032},
    32: {
        'x0': 0.085, 'bar_w': 0.140, 'gap': 0.038,
        'cx': 0.745, 'cy': 0.265, 'r': 0.180,
        'hand_w': 0.066, 'min_len': 0.120, 'hour_len': 0.086,
    },
    16: {
        'pad': 0.0, 'radius': 0.245,
        'x0': 0.065, 'bar_w': 0.150, 'gap': 0.035,
        'base_y': 0.865, 'tops': (0.630, 0.512, 0.395),
        'cx': 0.755, 'cy': 0.255, 'r': 0.180, 'halo': 0.022,
        'hand_w': 0.088, 'min_len': 0.126, 'hour_len': 0.092,
    },
}


def diagonal_gradient(size):
    """左上→右下的斜向线性渐变。按反对角线逐条画，省去 numpy 依赖。"""
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)
    steps = 2 * size
    for i in range(steps):
        t = i / (steps - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(GRAD_FROM, GRAD_TO))
        draw.line([(i, 0), (0, i)], fill=color)
    return img


def _disc(draw, cx, cy, r, size, fill=255):
    draw.ellipse([(cx - r) * size, (cy - r) * size,
                  (cx + r) * size, (cy + r) * size], fill=fill)


def _hand(draw, p, size, deg, length, fill=255):
    """从表盘圆心画一根指针，两端补圆点做圆头效果。"""
    a = math.radians(deg)
    x0, y0 = p['cx'] * size, p['cy'] * size
    x1 = x0 + math.sin(a) * length * size
    y1 = y0 - math.cos(a) * length * size
    w = max(1, round(p['hand_w'] * size))
    draw.line([(x0, y0), (x1, y1)], fill=fill, width=w)
    for (px, py) in ((x0, y0), (x1, y1)):
        draw.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=fill)


def build_foreground(size, p):
    """返回前景（白色图形）的 alpha 蒙版。"""
    bars = Image.new('L', (size, size), 0)
    db = ImageDraw.Draw(bars)
    x = p['x0']
    for top in p['tops']:
        db.rounded_rectangle(
            [x * size, top * size, (x + p['bar_w']) * size, p['base_y'] * size],
            radius=p['bar_w'] * size / 2, fill=255,
        )
        x += p['bar_w'] + p['gap']

    disc = Image.new('L', (size, size), 0)
    _disc(ImageDraw.Draw(disc), p['cx'], p['cy'], p['r'], size)

    halo = Image.new('L', (size, size), 0)
    _disc(ImageDraw.Draw(halo), p['cx'], p['cy'], p['r'] + p['halo'], size)

    hands = Image.new('L', (size, size), 0)
    dh = ImageDraw.Draw(hands)
    _hand(dh, p, size, 0.0, p['min_len'])
    _hand(dh, p, size, p['hour_deg'], p['hour_len'])

    # 柱子挖掉表盘外圈间隙；表盘挖掉指针；两者取并集
    bars = ImageChops.subtract(bars, halo)
    dial = ImageChops.subtract(disc, hands)
    return ImageChops.lighter(bars, dial)


def render(target, overrides):
    p = dict(BASE)
    p.update(overrides)
    size = target * SS

    bg = diagonal_gradient(size).convert('RGBA')
    pad = p['pad'] * size
    shape = Image.new('L', (size, size), 0)
    ImageDraw.Draw(shape).rounded_rectangle(
        [pad, pad, size - 1 - pad, size - 1 - pad],
        radius=p['radius'] * (size - 2 * pad), fill=255,
    )
    bg.putalpha(shape)

    fg = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    fg.putalpha(build_foreground(size, p))

    img = Image.alpha_composite(bg, fg)
    return img.resize((target, target), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for target in sorted(SPECS):
        img = render(target, SPECS[target])
        path = os.path.join(OUT_DIR, 'icon%d.png' % target)
        img.save(path, 'PNG', optimize=True)
        print('%s  %dx%d  %d bytes' % (path, target, target, os.path.getsize(path)))

    # 带 --preview 时额外拼一张放大对比图（不进 icons/，避免打包进插件）
    if '--preview' in sys.argv:
        preview = Image.new('RGBA', (16 * 20 + 32 * 10 + 48 * 7 + 128 * 3 + 5 * 16, 416),
                            (245, 246, 248, 255))
        x = 16
        for target, scale in ((16, 20), (32, 10), (48, 7), (128, 3)):
            im = Image.open(os.path.join(OUT_DIR, 'icon%d.png' % target))
            big = im.resize((target * scale, target * scale), Image.NEAREST)
            preview.alpha_composite(big, (x, 16))
            x += target * scale + 16
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icon-preview.png')
        preview.save(out)
        print('preview -> %s' % out)


if __name__ == '__main__':
    main()

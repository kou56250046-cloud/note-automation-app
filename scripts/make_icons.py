#!/usr/bin/env python3
"""PWA のアイコンを生成する。

    python scripts/make_icons.py

出力は assets/icons/ に置き、リポジトリに追跡する。
Actions で再生成しない（Pillow を入れる必要が出るため）。
意匠を変えたいときだけ手で実行して、生成物ごとコミットする。

2つのアプリを見分けられるように、配色を画面と揃えている。

  dash  : note-factory ダッシュボード。濃紺 #050D16 に金 #D4A94A
  posts : 投稿キュー。青 #2B6CB0 に白

maskable は中央 80% のセーフゾーンに収める必要があるため、
図形を 0.62 倍まで縮めている（通常版は 0.86）。
"""

from pathlib import Path

from PIL import Image, ImageDraw

SS = 4  # スーパーサンプリング倍率。描いてから縮小してアンチエイリアスをかける

OUT = Path(__file__).resolve().parent.parent / "assets" / "icons"

VOID = (5, 13, 22)      # --void
GOLD = (212, 169, 74)   # --gold
BLUE = (43, 108, 176)   # posts の --accent
WHITE = (255, 255, 255)


def mix(fg, bg, a):
    """半透明を背景と混ぜて不透明色にする。

    ImageDraw は RGBA 画像に描いても合成せず上書きするため、
    背景が単色である利点を使って先に混ぜてしまう。
    """
    return tuple(round(f * a + b * (1 - a)) for f, b in zip(fg, bg))


def canvas(size, bg):
    im = Image.new("RGB", (size * SS, size * SS), bg)
    return im, ImageDraw.Draw(im)


def mapper(size, scale):
    """48x48 のビューボックス座標を実ピクセルに移す。"""
    s = size * SS
    c = s / 2
    u = s / 48 * scale
    return (lambda x, y: (c + (x - 24) * u, c + (y - 24) * u)), u


def dash_mark(d, size, scale):
    """ダッシュボードの意匠。画面の SVG マークと同じ形を描く。

    二重円（製図のコンパス）と、上向きに尖ったペン先。
    """
    p, u = mapper(size, scale)

    for r, alpha in ((19, 0.45), (13, 0.28)):
        d.ellipse([p(24 - r, 24 - r), p(24 + r, 24 + r)],
                  outline=mix(GOLD, VOID, alpha), width=max(1, round(0.9 * u)))

    d.line([p(24, 8), p(36, 34), p(24, 28), p(12, 34), p(24, 8)],
           fill=GOLD, width=max(1, round(1.5 * u)), joint="curve")

    r = 2.2 * u
    x, y = p(24, 8)
    d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD)


def posts_mark(d, size, scale):
    """投稿キューの意匠。紙に行が3本。

    ダッシュボードが「円と三角」なので、輪郭の印象が重ならないよう
    角のある形にしている。ホーム画面で並んだときに見分けるための形である。
    """
    p, u = mapper(size, scale)

    d.rounded_rectangle([p(13, 9), p(35, 39)], radius=2.6 * u, fill=WHITE)

    # 3行目だけ短くして「書きかけ」に見せる
    for y, right in ((17.5, 30), (24, 30), (30.5, 26)):
        d.rounded_rectangle([p(18, y - 1.4), p(right, y + 1.4)],
                            radius=1.4 * u, fill=BLUE)


VARIANTS = {
    "dash": (VOID, dash_mark),
    "posts": (BLUE, posts_mark),
}

# (接尾辞, 実サイズ, 図形スケール)
SIZES = [
    ("192", 192, 0.86),
    ("512", 512, 0.86),
    ("maskable-512", 512, 0.62),   # セーフゾーンに収める
    ("apple-180", 180, 0.78),      # iOS は角を自前で丸めるので少し内側に
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    made = []

    for name, (bg, draw_mark) in VARIANTS.items():
        for suffix, size, scale in SIZES:
            im, d = canvas(size, bg)
            draw_mark(d, size, scale)
            im = im.resize((size, size), Image.LANCZOS)
            path = OUT / f"{name}-{suffix}.png"
            im.save(path, optimize=True)
            made.append(f"{path.name} ({path.stat().st_size:,} bytes)")

    print(f"{OUT} に {len(made)} 個を生成しました")
    for m in made:
        print(f"  - {m}")


if __name__ == "__main__":
    main()

"""Draws the link-preview image for every chapter of the first book: site/assets/img/share/ch-<n>.png (1200x630).

Run after scripts/build-story.mjs:  python3 scripts/build-share-cards.py   (needs Pillow: pip install pillow)
Fonts are Press Start 2P and VT323 (SIL Open Font License, see scripts/fonts).
"""
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / 'scripts' / 'fonts'
OUT = ROOT / 'site' / 'assets' / 'img' / 'share'
W, H = 1200, 630
BG, PANEL, EDGE, INK = (15, 16, 22), (28, 30, 42), (56, 60, 85), (7, 7, 11)
TEXT, MUTED, ORANGE = (238, 238, 243), (166, 170, 187), (246, 137, 47)
# One accent per arc of the story, matching the arcs on the Universe page.
ARCS = [(10, (246, 137, 47)), (19, (159, 198, 226)), (29, (111, 220, 140)), (39, (190, 150, 255)), (999, (255, 110, 110))]

src = (ROOT / 'site' / 'data' / 'books.js').read_text(encoding='utf8')
book = json.loads(src[src.index('['):src.rindex(']') + 1])[0]
pixel = lambda size: ImageFont.truetype(str(FONTS / 'PressStart2P.woff'), size)
term = lambda size: ImageFont.truetype(str(FONTS / 'VT323.woff'), size)
logo = Image.open(ROOT / 'site' / 'assets' / 'img' / 'logo-transparent.png').convert('RGBA')
logo = logo.resize((420, round(420 * logo.height / logo.width)), Image.LANCZOS)


def wrap(draw, text, font, width):
    lines, line = [], ''
    for word in text.split():
        test = f'{line} {word}'.strip()
        if draw.textlength(test, font=font) <= width or not line:
            line = test
        else:
            lines.append(line)
            line = word
    return lines + [line]


def frame(draw, box, fill, edge, px=6):
    x0, y0, x1, y1 = box
    draw.rectangle((x0 + px * 2, y0 + px * 2, x1 + px * 2, y1 + px * 2), fill=INK)  # hard shadow
    draw.rectangle((x0, y0 - px, x1, y1 + px), fill=edge)  # notched pixel border
    draw.rectangle((x0 - px, y0, x1 + px, y1), fill=edge)
    draw.rectangle(box, fill=fill)


def card(ch, total):
    accent = next(c for last, c in ARCS if ch['n'] <= last)
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    rnd = random.Random(ch['n'])
    for _ in range(110):  # pixel starfield
        x, y, s = rnd.randrange(W), rnd.randrange(H), rnd.choice((2, 2, 4))
        d.rectangle((x, y, x + s, y + s), fill=rnd.choice((MUTED, EDGE, TEXT)))
    for x in range(0, W, 16):  # checker strip, like the site's section edges
        d.rectangle((x, H - 16, x + 7, H - 9), fill=EDGE)
        d.rectangle((x + 8, H - 8, x + 15, H - 1), fill=EDGE)
    im.paste(logo, (64, 52), logo)
    frame(d, (64, 150, W - 64, 520), PANEL, EDGE)
    d.rectangle((64, 150, 76, 520), fill=accent)
    d.text((112, 196), f"{book['title'].upper()}", font=pixel(22), fill=accent)
    d.text((112, 236), f"CHAPTER {ch['n']} OF {total}", font=pixel(18), fill=MUTED)
    size = 46
    while True:
        font = pixel(size)
        lines = wrap(d, ch['title'].upper(), font, W - 240)
        if len(lines) <= 2 or size <= 30:
            break
        size -= 4
    y = 300
    for line in lines[:3]:
        d.text((114, y + 4), line, font=font, fill=INK)
        d.text((112, y), line, font=font, fill=TEXT)
        y += size + 22
    d.text((112, 456), f"{ch['words']:,} words · about {max(1, round(ch['words'] / 230))} min", font=term(40), fill=MUTED)
    cta = 'READ FREE AT NINEFOLDVISION.ONLINE'
    f = pixel(16)
    tw = d.textlength(cta, font=f)
    frame(d, (W - 64 - tw - 48, 552, W - 64, 592), ORANGE, (184, 90, 16), 4)
    d.text((W - 64 - tw - 24, 564), cta, font=f, fill=INK)
    return im


OUT.mkdir(parents=True, exist_ok=True)
for ch in book['chapters']:
    card(ch, len(book['chapters'])).quantize(64, dither=Image.Dither.NONE).save(OUT / f"ch-{ch['n']}.png", optimize=True)
print(f"{len(book['chapters'])} share cards in {OUT.relative_to(ROOT)}")

"""Compose the README hero from the artwork and a real application screenshot.

Requires Pillow. The source background was generated for this project; all UI
shown in the poster comes from docs/screenshots/live-citation.png.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1800, 780
NAVY = "#071726"
IVORY = "#F7F6EF"
MUTED = "#BAC9D0"
LIME = "#CCFF65"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    serif = name.startswith("georgia")
    bold = name in {"georgiab.ttf", "segoeuib.ttf"}
    alternatives = (
        ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "DejaVuSerif-Bold.ttf"]
        if serif and bold
        else ["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "DejaVuSerif.ttf"]
        if serif
        else ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"]
        if bold
        else ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"]
    )
    for candidate in [str(Path("C:/Windows/Fonts") / name), *alternatives]:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    raise OSError(f"No suitable font found for {name}")


def rounded_screen(source: Image.Image, size: tuple[int, int], radius: int) -> Image.Image:
    screen = source.resize(size, Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    screen.putalpha(mask)
    return screen


def main() -> None:
    background = Image.open(ROOT / "docs/assets/readme-background.webp").convert("RGB")
    # Keep the architectural paper motif while fitting an ultra-wide README banner.
    source_ratio = background.width / background.height
    target_ratio = WIDTH / HEIGHT
    if source_ratio < target_ratio:
        cropped_height = int(background.width / target_ratio)
        top = int((background.height - cropped_height) * 0.43)
        background = background.crop((0, top, background.width, top + cropped_height))
    else:
        cropped_width = int(background.height * target_ratio)
        background = background.crop((0, 0, cropped_width, background.height))
    canvas = background.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).convert("RGBA")

    veil = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    veil_pixels = veil.load()
    for x in range(WIDTH):
        strength = 150 if x < 830 else max(15, int(150 - (x - 830) * 0.14))
        for y in range(HEIGHT):
            veil_pixels[x, y] = (3, 13, 27, strength)
    canvas = Image.alpha_composite(canvas, veil)

    screenshot = Image.open(ROOT / "docs/screenshots/live-citation.png")
    screenshot = screenshot.crop((305, 70, 1440, 850))
    screen_w, screen_h = 800, 550
    sx, sy = 905, 112
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (sx + 12, sy + 20, sx + screen_w + 12, sy + screen_h + 20),
        radius=27,
        fill=(0, 0, 0, 165),
    )
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(24)))
    screen = rounded_screen(screenshot, (screen_w, screen_h), 24)
    canvas.alpha_composite(screen, (sx, sy))

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((sx - 2, sy - 2, sx + screen_w + 1, sy + screen_h + 1), radius=26, outline=(222, 244, 225, 155), width=2)
    draw.rounded_rectangle((88, 86, 138, 136), radius=12, outline=LIME, width=3)
    draw.text((99, 87), "M", font=font("georgiab.ttf", 35), fill=IVORY)
    draw.text((157, 98), "EVIDENCE-LED CONTRACT INTELLIGENCE", font=font("segoeuib.ttf", 21), fill=LIME)

    draw.text((84, 173), "MARGIN", font=font("georgiab.ttf", 139), fill=IVORY, stroke_width=1)
    draw.rounded_rectangle((89, 351, 180, 358), radius=3, fill=LIME)
    draw.text((86, 394), "Answers you can", font=font("georgia.ttf", 55), fill=IVORY)
    draw.text((86, 464), "trace to the clause.", font=font("georgia.ttf", 55), fill=IVORY)
    draw.text((89, 571), "Read. Research. Compare. Verify.", font=font("segoeui.ttf", 29), fill=MUTED)

    chips = ["PDF + DOCX", "VERIFIED CITATIONS", "CLAUSE DIFF"]
    cx = 89
    chip_font = font("segoeuib.ttf", 17)
    for chip in chips:
        chip_width = int(draw.textlength(chip, font=chip_font)) + 36
        draw.rounded_rectangle((cx, 667, cx + chip_width, 710), radius=13, fill=(10, 37, 48, 230), outline=(145, 197, 161, 140), width=1)
        draw.text((cx + 18, 676), chip, font=chip_font, fill=IVORY)
        cx += chip_width + 12

    output = ROOT / "docs/readme-poster.png"
    canvas.convert("RGB").save(output, optimize=True)
    print(output)


if __name__ == "__main__":
    main()

# Chronicle Design Cheatsheet

Quick reference for agents producing documents with Chronicle.

## Tokens & Palette

- **Light Surface**: `#fbf9f6` | **Dark Surface**: `#121418`
- **Primary Ink**: Light `#16181d` | Dark `#e8ecf1`
- **Secondary Ink**: Light `#464e5f` | Dark `#a3abb8`
- **Sole Accent**: Light `#537791` | Dark `#9cb4cd` (Keyword / Highlights only, NEVER block background)
- **Subtle Fill**: 4% Primary Ink (`rgba(22, 24, 29, 0.04)`)
- **Subtle Border**: 14% Primary Ink (`rgba(22, 24, 29, 0.14)`)
- **Stroke Tint**: 55% Primary Ink (`rgba(22, 24, 29, 0.55)`)

## Typography Polarity

- **Narrative / Body**: CJK Sans-serif (`Noto Sans SC`), weight `300-400`, line-height `>= 1.80` (Page), left-aligned. Resume uses weight `400` and line-height `1.55`.
- **Headings**: CJK Serif (`Noto Serif SC`), weight `600` (H2/H3) or `700` (H1).
- **No Justify**: `text-align: justify` is strictly forbidden.
- **Pangu Spacing**: Always space between CJK and Latin/numbers.

## Formats & Commands

```bash
# Long Article (HTML, PNG, A4 PDF)
node skills/chronicle/scripts/deliver.mjs article.md [annotations.json]

# Social Cards / Fixed Aspect Ratio
node skills/chronicle/scripts/deliver.mjs article.md --aspect 3:4   # 3:4 卡片 (1080x1440)
node skills/chronicle/scripts/deliver.mjs article.md --aspect 1:1   # 1:1 方形卡片 (1200x1200)
node skills/chronicle/scripts/deliver.mjs article.md --aspect 21:9  # 21:9 宽卡片 (2100x900)
node skills/chronicle/scripts/deliver.mjs article.md --aspect 16:9  # 16:9 封面 (1920x1080)

# Slides (16:9 Presentation Deck)
node skills/chronicle/scripts/deliver.mjs slides.md --format slides

# Resume (A4 CV / Resume)
node skills/chronicle/scripts/deliver.mjs resume.md --format resume

# Favicon (Theme-adaptive SVG + PNG)
node skills/chronicle/scripts/favicon.mjs --char C --out-dir site --png

# GitHub Profile README & Adaptive SVG Banner
node skills/chronicle/scripts/profile.mjs --name "CEDAR" --title "Systems Architect" --out-dir profile
```

## Hard Constraints Checklist

1. Left-aligned body (never justify).
2. Exactly one sole accent, no warning colors.
3. Body weight 300-400 for prose, 400 for resume.
4. Line-height ratio: Page >= 1.80, Slides >= 1.75, Resume 1.55 (>= 1.50).
5. No software drop shadows in reading flow.
6. Reading container width <= 896px.
7. CJK and Latin characters separated by space.

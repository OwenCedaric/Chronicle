# Chronicle Design Cheatsheet

Quick reference for agents producing documents with Chronicle.

## Tokens & Palette

- **Light Surface**: `#fbf9f6` | **Dark Surface**: `#1c1f26`
- **Primary Ink**: Light `#3d4451` | Dark `#d2d6dd`
- **Secondary Ink**: Light `#757d8a` | Dark `#a0a7b4`
- **Sole Accent**: Light `#82a1b9` | Dark `#9cb4cd` (Keyword / Highlights only, NEVER block background)
- **Subtle Fill**: 8% Primary Ink (`rgba(61, 68, 81, 0.08)`)
- **Subtle Border**: 20% Primary Ink (`rgba(61, 68, 81, 0.20)`)
- **Stroke Tint**: 60% Primary Ink (`rgba(61, 68, 81, 0.60)`)

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

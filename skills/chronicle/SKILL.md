---
name: chronicle
description: 'Typeset and render Markdown documents into long-form reading HTML, social cards (3:4, 1:1, 21:9), 16:9 presentation slide decks, and A4 resumes using the Chronicle Design System. Use when asked to 排版 / Markdown 渲染 / 做长图 / 社交卡片 / 小红书图文 / 公众号头图 / 幻灯片 / PPT / 简历 / Chronicle 风格.'
---

# Chronicle Design System Skill

> A visual and typographic design system engineered for long-form content, presentations, and print media.

## 0 · Core Philosophy & The 7 Hard Constraints

1. **Chromatic Austerity**: Exactly one neutral base and one sole accent (`#537791` in light / `#9cb4cd` in dark). No warning colors (red/green/yellow).
2. **Typographic Polarity**: Serif typefaces (Noto Serif SC) for weight, pause, and emphasis; Sans-serif (Noto Sans SC) for narrative flow.
3. **Vacuum as Rhythm**: Massive vertical whitespace acts as punctuation.
4. **Alignment Contamination Prohibition**: Narrative body text **must always be Left-Aligned (flush-left, ragged-right)**. `Justify` alignment is strictly forbidden.
5. **Body Weight Discipline**: Narrative paragraphs use 300 Light or 400 Regular; Resume and cards use 400 Regular for scanability; weights >= 500 are reserved for titles and metrics.
6. **Line-Height Collapse Prohibition**: Body line-height ratio **must never drop below 1.80** for Page, **>= 1.75** for Slides, **1.55 (>= 1.50)** for Resume.
7. **Shadow Abuse Prohibition**: Drop shadows (box-shadow and filter drop-shadow) are strictly prohibited in the reading flow (only a 2% micro-shadow on left chat bubble).
8. **Visual Field Ceiling**: Container max-width `896px` (Page), with minimum `24px` horizontal safe padding.
9. **CJK-Latin Spacing**: A space must always separate CJK and Latin characters/numerals.

## 1 · Formats & Routing

| Document Format | Frontmatter / Flag | Key Rules & Medium Adaptation | Target Outputs |
|---|---|---|---|
| **Page** (Default) | `type: "page"` / `--format page` | Core reading container 896px, Epigraphs, Section breaks, Chat box, Coda. | Self-contained HTML, 2x Retina Long PNG, A4 Vector PDF with running header/footer. |
| **Social Card** | `--aspect 3:4\|1:1\|21:9\|16:9\|all` | Inherits Chronicle austerity; solid bold headings (no hollow); high-contrast compact line-height 1.65; clip to specified aspect. | Retina 2x PNG cards (e.g. 1080x1440, 1200x1200, 2100x900, 1920x1080). |
| **Slides** | `type: "slides"` / `--format slides` | 16:9 Aspect ratio, max 3 colors per slide, line spacing locked at 1.8, text overflow cut, keyboard/touch navigation. | Interactive HTML presentation, 16:9 Slide deck vector PDF. |
| **Resume** | `type: "resume"` / `--format resume` | Pure white `#ffffff` base, pitch-black ink `#111827`, 400 Regular body, 1.55 line-height, 4-column metrics, evolution arc, 3-part structured bullets (Role/Actions/Impact), pressmark seal. | Clean A4 print HTML, Vector PDF, Long PNG. |
| **Profile** | `profile.mjs` | Theme-adaptive SVG banner with hollow stroke typography + austere GitHub Profile README. | Adaptive Dark/Light `banner.svg`, `README.md`. |
| **Favicon** | `favicon.mjs` | Austere geometric hairline circle with hollow Serif glyph and automatic dark/light switching. | Vector `favicon.svg`, Retina `favicon.png`. |

## 1.5 · Container Directives (Markdown Syntax)

Use these block-level directives directly in Markdown source. They work **without** `annotations.json`.

**Chat Box** (two-party dialogue):
```
:::chat
- Speaker1 (左): "First message"
- Speaker2 (右): "Reply message"
:::
```
Side markers: `左` / `left` = left bubble, `右` / `right` = right bubble.

**Dual Column** (side-by-side comparison):
```
:::dual
[Left Column Title]
- Point A
- Point B

[Right Column Title]
- Point C
- Point D
:::
```
If no `[Title]` markers are provided, content is split in half automatically.

These directives are processed before Markdown compilation and generate the same HTML components as `annotations.json` upgrades.

## 2 · Workflow Protocol

### Step 1 · Lock the Contract
Before generating, state the deliverable contract in one concise sentence:
- **Format**: `page` | `slides` | `resume`
- **Output**: HTML / Long Image (PNG) / PDF
- **Theme**: Light (`#fbf9f6`) or Dark (`#121418`)
- **Mode**: *Faithful* (original text preserved) or *Interpretive* (enhanced components).

### Step 2 · Generate Annotations (`annotations.json`)
Produce structured metadata according to format:
- For `page`: Epigraphs, Section Breaks, Chat Box, Dual Column, Coda.
- For `slides`: Slide titles, dual comparison, statement slides.
- For `resume`: Candidate name, headline, contact, timeline.

Example `annotations.json`:
```json
{
  "meta": { "title": "文章标题", "subtitle": "副标题", "author": "作者", "date": "2026.11" },
  "upgrades": [
    { "type": "epigraph", "target": "被引文字", "data": { "source": "出处" } },
    { "type": "section_break", "target": "章节标题", "data": { "watermark": "壹" } },
    { "type": "coda", "data": { "framing_top": "CHRONICLE", "focal_char": "終", "framing_bottom": "FIN" } }
  ]
}
```

> Note: Chat Box and Dual Column can also be written directly in Markdown using `:::chat` / `:::dual` directives (see Section 1.5), without needing annotations.

### Step 3 · Deterministic Delivery
Run the delivery script:
```bash
node skills/chronicle/scripts/deliver.mjs input.md [annotations.json] --format [page|slides|resume] [--aspect 3:4|1:1|16:9|21:9|long] --png --pdf
```
The pipeline automatically runs:
1. Pangu CJK spacing injection.
2. Container directive (`:::chat` / `:::dual`) preprocessing.
3. Deterministic compilation into self-contained HTML.
4. Automated Quality Gate linting (verifying all Hard Constraints for the chosen format).
5. Headless Chrome export of Retina-grade PNG and vector PDF.

### Troubleshooting
- **Lint gate failure**: Read the constraint violation message. Fix the source Markdown or annotations to eliminate unauthorized colors, justify alignment, or weight violations, then re-run.
- **Export failure**: Ensure Google Chrome or Chromium is installed. Set `CHROME_PATH=/path/to/chrome` if auto-detection fails.
- **Font rendering**: First run requires network access to load Google Fonts (Noto Sans SC, Noto Serif SC). Subsequent renders use browser cache.

### Peripheral Tools

#### Favicon Generator
Generate a theme-adaptive, hollow-stroke vector favicon:
```bash
node skills/chronicle/scripts/favicon.mjs [--char C] [--shape circle|squircle|square] [--out-dir site] [--png]
```

#### GitHub Profile Generator
Generate an adaptive SVG banner and an austere GitHub Profile README:
```bash
node skills/chronicle/scripts/profile.mjs [--name <NAME>] [--title <TITLE>] [--quote <QUOTE>] [--out-dir profile]
```

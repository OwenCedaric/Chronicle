---
name: chronicle
description: 'Typeset and render Markdown documents into long-form reading HTML, social cards (3:4, 1:1, 21:9), 16:9 presentation slide decks, and A4 resumes using the Chronicle Design System. Use when asked to 排版 / Markdown 渲染 / 做长图 / 社交卡片 / 小红书图文 / 公众号头图 / 幻灯片 / PPT / 简历 / Chronicle 风格.'
---

# Chronicle Design System Skill

> A visual and typographic design system engineered for long-form content, presentations, and print media.

## 0 · Core Philosophy & The 7 Hard Constraints

1. **Chromatic Austerity**: Exactly one neutral base and one sole accent (`#82a1b9` in light / `#9cb4cd` in dark). No warning colors (red/green/yellow).
2. **Typographic Polarity**: Serif typefaces (Noto Serif SC) for weight, pause, and emphasis; Sans-serif (Noto Sans SC) for narrative flow.
3. **Vacuum as Rhythm**: Massive vertical whitespace acts as punctuation.
4. **Alignment Contamination Prohibition**: Narrative body text **must always be Left-Aligned (flush-left, ragged-right)**. `Justify` alignment is strictly forbidden.
5. **Body Weight Discipline**: Narrative paragraphs use 300 Light or 400 Regular; Resume and cards use 400 Regular for scanability; weights ≥ 600 are reserved for titles and metrics.
6. **Line-Height Collapse Prohibition**: Body line-height ratio **must never drop below 1.85** for Page, **locked at 1.8** for Slides, **>= 1.7** for Resume.
7. **Shadow Abuse Prohibition**: Drop shadows are strictly prohibited in the reading flow (only a 2% micro-shadow on left chat bubble).
8. **Visual Field Ceiling**: Container max-width `896px` (Page), with minimum `24px` horizontal safe padding.
9. **CJK-Latin Spacing**: A space must always separate CJK and Latin characters/numerals.

## 1 · Formats & Routing

| Document Format | Frontmatter / Flag | Key Rules & Medium Adaptation | Target Outputs |
|---|---|---|---|
| **Page** (Default) | `type: "page"` / `--format page` | Core reading container 896px, Epigraphs, Section breaks, Chat box, Coda. | Self-contained HTML, 2x Retina Long PNG, A4 Vector PDF with running header/footer. |
| **Slides** | `type: "slides"` / `--format slides` | 16:9 Aspect ratio, max 3 colors per slide, line spacing locked at 1.8, text overflow cut, keyboard/touch navigation. | Interactive HTML presentation, 16:9 Slide deck vector PDF. |
| **Resume** | `type: "resume"` / `--format resume` | Pure white `#ffffff` base, `#f5f5f5` subtle fill, line-height >= 1.7, spacious 2-page layout strictly preferred over 1-page compression. | Clean A4 print HTML, Vector PDF. |
| **Profile** | `profile.mjs` | Theme-adaptive SVG banner with hollow stroke typography + austere GitHub Profile README. | Adaptive Dark/Light `banner.svg`, `README.md`. |
| **Favicon** | `favicon.mjs` | Austere geometric hairline circle with hollow Serif glyph and automatic dark/light switching. | Vector `favicon.svg`, Retina `favicon.png`. |

## 2 · Workflow Protocol

### Step 1 · Lock the Contract
Before generating, state the deliverable contract in one concise sentence:
- **Format**: `page` | `slides` | `resume`
- **Output**: HTML / Long Image (PNG) / PDF
- **Theme**: Light (`#fbf9f6`) or Dark (`#1c1f26`)
- **Mode**: *Faithful* (original text preserved) or *Interpretive* (enhanced components).

### Step 2 · Generate Annotations (`annotations.json`)
Produce structured metadata according to format:
- For `page`: Epigraphs, Section Breaks, Chat Box, Dual Column, Coda.
- For `slides`: Slide titles, dual comparison, statement slides.
- For `resume`: Candidate name, headline, contact, timeline.

### Step 3 · Deterministic Delivery
Run the delivery script:
```bash
node skills/chronicle/scripts/deliver.mjs input.md [annotations.json] --format [page|slides|resume] [--aspect 3:4|1:1|16:9|21:9|long] --png --pdf
```
The pipeline automatically runs:
1. Pangu CJK spacing injection.
2. Deterministic compilation into self-contained HTML.
3. Automated Quality Gate linting (verifying all 7 Hard Constraints for the chosen format).
4. Headless Chrome export of Retina-grade PNG and vector PDF.

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

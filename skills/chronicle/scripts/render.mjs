#!/usr/bin/env node
/**
 * Chronicle Design System - Deterministic Multi-Format Renderer
 * Supports:
 *   --format page   (Long-form article, default)
 *   --format slides (16:9 Presentation Deck)
 *   --format resume (A4 Spacious Professional Resume)
 *
 * Usage: node render.mjs <input.md> [annotations.json] [output.html] [--format page|slides|resume] [--theme light|dark]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { spacing } from './pangu.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI arguments
const rawArgs = process.argv.slice(2);
const flags = {};
const positional = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = rawArgs[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  } else {
    positional.push(arg);
  }
}

const mdPath = positional[0];
const maybeAnnoPath = positional[1];
const maybeOutPath = positional[2];

if (!mdPath) {
  console.error('Usage: node render.mjs <input.md> [annotations.json] [output.html] [--format page|slides|resume] [--theme light|dark]');
  process.exit(1);
}

let annoPath = null;
let outPath = null;

if (maybeAnnoPath && maybeAnnoPath.endsWith('.json')) {
  annoPath = maybeAnnoPath;
  outPath = maybeOutPath || mdPath.replace(/\.md$/, '.html');
} else {
  outPath = maybeAnnoPath || mdPath.replace(/\.md$/, '.html');
}

// Read Markdown
const rawMd = readFileSync(resolve(mdPath), 'utf-8');

// Read Annotations if present
let annotations = { meta: {}, upgrades: [] };
if (annoPath && existsSync(resolve(annoPath))) {
  try {
    annotations = JSON.parse(readFileSync(resolve(annoPath), 'utf-8'));
  } catch (err) {
    console.error(`ERROR: Failed to parse annotations file: ${annoPath}`, err);
  }
}

// Extract YAML Frontmatter
let contentMd = rawMd;
const fmMatch = rawMd.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (fmMatch) {
  const fmLines = fmMatch[1].split('\n');
  for (const line of fmLines) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      const key = kv[1].trim();
      const val = kv[2].trim().replace(/^["']|["']$/g, '');
      if (!annotations.meta[key]) {
        annotations.meta[key] = val;
      }
    }
  }
  contentMd = rawMd.slice(fmMatch[0].length);
}

// Determine format: CLI flag > frontmatter format/type > default 'page'
const docFormat = flags.format || flags.type || annotations.meta.format || annotations.meta.type || 'page';
const aspect = flags.aspect || annotations.meta.aspect || 'long';
const isCard = aspect && aspect !== 'long' && aspect !== 'auto';
const theme = flags.theme || annotations.meta.theme || 'light';
const docTitle = annotations.meta.title || annotations.meta.name || 'Chronicle Document';

// Apply Pangu spacing across text
contentMd = spacing(contentMd);

// Inline keyword syntax: ==keyword== -> <span class="keyword">keyword</span>
contentMd = contentMd.replace(/==([^=]+)==/g, '<span class="keyword">$1</span>');

// Strikethrough syntax: ~~struck~~
contentMd = contentMd.replace(/~~([^~]+)~~/g, '<del class="strikethrough">$1</del>');

let finalHtml = '';

// ==========================================
// 1. FORMAT: SLIDES (16:9 Presentation Deck)
// ==========================================
if (docFormat === 'slides') {
  const cssPath = resolve(__dirname, '../templates/styles/slides.css');
  const tplPath = resolve(__dirname, '../templates/slides.html');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const tplContent = readFileSync(tplPath, 'utf-8');

  // Split markdown into slides by '---'
  const slideSections = contentMd.split(/\n---\r?\n/).map(s => s.trim()).filter(Boolean);
  const slideHtmls = [];

  // Slide 1: Hero / Title Slide
  const heroSlide = `
  <section class="chronicle-slide slide-hero active">
    <div class="hero-hollow">${docTitle}</div>
    ${annotations.meta.subtitle ? `<div class="hero-subtitle">${annotations.meta.subtitle}</div>` : ''}
    <div class="hero-meta">
      ${annotations.meta.author ? `<span>${annotations.meta.author}</span>` : ''}
      ${annotations.meta.date ? `<span>${annotations.meta.date}</span>` : ''}
    </div>
  </section>`;
  slideHtmls.push(heroSlide);

  // Subsequent Slides
  for (const rawSlide of slideSections) {
    let slideContent = rawSlide;
    let isStatement = false;

    // Check if slide contains dual column block :::dual ... :::
    const dualMatch = slideContent.match(/:::dual\s*([\s\S]*?):::/);
    if (dualMatch) {
      const dualText = dualMatch[1];
      const parts = dualText.split(/\[(.*?)\]/).filter(Boolean);
      let leftHtml = '';
      let rightHtml = '';
      if (parts.length >= 4) {
        leftHtml = `<h3>${parts[0]}</h3>${marked.parse(parts[1])}`;
        rightHtml = `<h3>${parts[2]}</h3>${marked.parse(parts[3])}`;
      } else {
        const lines = dualText.trim().split('\n');
        const mid = Math.ceil(lines.length / 2);
        leftHtml = marked.parse(lines.slice(0, mid).join('\n'));
        rightHtml = marked.parse(lines.slice(mid).join('\n'));
      }
      const dualGridHtml = `
      <div class="slide-dual-grid">
        <div class="slide-dual-col">${leftHtml}</div>
        <div class="slide-dual-col">${rightHtml}</div>
      </div>`;
      slideContent = slideContent.replace(dualMatch[0], dualGridHtml);
    }

    // Check if statement slide (starts with >)
    if (slideContent.trim().startsWith('>')) {
      isStatement = true;
    }

    const parsedBody = marked.parse(slideContent);
    const slideClass = isStatement ? 'chronicle-slide slide-statement' : 'chronicle-slide slide-content';

    slideHtmls.push(`
  <section class="${slideClass}">
    ${parsedBody}
  </section>`);
  }

  finalHtml = tplContent
    .replace('{{THEME}}', theme)
    .replace('{{TITLE}}', docTitle)
    .replace('{{STYLES}}', cssContent)
    .replace('{{SLIDES}}', slideHtmls.join('\n'));

// ==========================================
// 2. FORMAT: RESUME (Architectural & Editorial CV)
// ==========================================
} else if (docFormat === 'resume') {
  const cssPath = resolve(__dirname, '../templates/styles/resume.css');
  const tplPath = resolve(__dirname, '../templates/resume.html');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const tplContent = readFileSync(tplPath, 'utf-8');

  const rawName = annotations.meta.name || docTitle;
  let displayName = rawName;
  let alias = annotations.meta.alias || '';
  const nameParenMatch = rawName.match(/^([^(（]+)[(（]([^)）]+)[)）]/);
  if (nameParenMatch) {
    displayName = nameParenMatch[1].trim();
    if (!alias) alias = nameParenMatch[2].trim();
  }

  const headline = annotations.meta.headline || annotations.meta.title || '';
  const email = annotations.meta.email || '';
  const phone = annotations.meta.phone || '';
  const location = annotations.meta.location || '';
  const github = annotations.meta.github || '';
  const website = annotations.meta.website || '';
  const sealChar = annotations.meta.seal || displayName.charAt(0) || 'C';

  const headerHtml = `
  <header class="resume-header">
    <div class="resume-header-left">
      <div class="resume-name-row">
        <h1 class="resume-name">${displayName}</h1>
        ${alias ? `<span class="resume-alias">(${alias})</span>` : ''}
      </div>
      ${headline ? `<div class="resume-headline">${headline}</div>` : ''}
      <div class="resume-contact">
        ${email ? `<span>Email: <a href="mailto:${email}">${email}</a></span>` : ''}
        ${phone ? `<span>Tel: ${phone}</span>` : ''}
        ${location ? `<span>Loc: ${location}</span>` : ''}
        ${github ? `<span>GitHub: <a href="https://${github.replace(/^https?:\/\//, '')}" target="_blank">${github}</a></span>` : ''}
        ${website ? `<span>Web: <a href="https://${website.replace(/^https?:\/\//, '')}" target="_blank">${website}</a></span>` : ''}
      </div>
    </div>
    <div class="resume-seal" title="Chronicle Imprint">${sealChar}</div>
  </header>`;

  const SECTION_SUB_MAP = {
    '个人简介': 'SUMMARY',
    '核心战绩': 'KEY IMPACT',
    '核心指标': 'KEY IMPACT',
    '职业演进': 'CAREER EVOLUTION',
    '进化弧': 'EVOLUTION',
    '工作经历': 'EXPERIENCE',
    '职业经历': 'EXPERIENCE',
    '核心项目': 'FEATURED PROJECTS',
    '项目经历': 'PROJECTS',
    '开源与技术作品': 'OPEN SOURCE & ARTIFACTS',
    '开源与作品': 'OPEN SOURCE & ARTIFACTS',
    '开源贡献': 'OPEN SOURCE',
    '技能与专长': 'SKILLS & EXPERTISE',
    '专业技能': 'SKILLS',
    '教育背景': 'EDUCATION',
    '学术背景': 'ACADEMIC'
  };

  const sections = contentMd.split(/\n(?=##\s+)/);
  const outSections = [];

  for (const s of sections) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const headerMatch = trimmed.match(/^##\s+([^\n]+)/);
    if (!headerMatch) {
      outSections.push(`<section class="resume-section">${marked.parse(trimmed)}</section>`);
      continue;
    }

    let rawTitle = headerMatch[1].trim();
    let subLabel = '';
    if (rawTitle.includes('|')) {
      const parts = rawTitle.split('|').map(p => p.trim());
      rawTitle = parts[0];
      subLabel = parts[1];
    } else {
      subLabel = SECTION_SUB_MAP[rawTitle] || '';
    }

    const content = trimmed.slice(headerMatch[0].length).trim();
    let sectionHtml = '';

    // 1. Metrics section (Executive Metrics Bar)
    if (/核心战绩|核心指标|KEY IMPACT/i.test(rawTitle)) {
      const lines = content.split('\n').filter(l => l.trim().startsWith('-'));
      const metrics = [];
      for (const l of lines) {
        const m = l.match(/-\s*\*\*([^*]+)\*\*\s*\|\s*(.*)/);
        if (m) metrics.push({ value: m[1].trim(), label: m[2].trim() });
      }
      sectionHtml = `
      <div class="resume-metrics">
        ${metrics.map(m => `
          <div class="metric">
            <div class="metric-value">${m.value}</div>
            <div class="metric-label">${m.label}</div>
          </div>`).join('')}
      </div>`;
      outSections.push(sectionHtml);
      continue;
    }

    // 2. Timeline (Career Evolution Arc)
    if (/职业演进|进化弧|CAREER EVOLUTION|TIMELINE/i.test(rawTitle)) {
      const lines = content.split('\n').filter(l => l.trim().startsWith('-'));
      const timeline = [];
      for (const l of lines) {
        const m = l.match(/-\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*(.*)/);
        if (m) timeline.push({ year: m[1].trim(), head: m[2].trim(), body: m[3].trim() });
      }
      sectionHtml = `
      <div class="resume-timeline">
        ${timeline.map(t => `
          <div class="tl-step">
            <div class="tl-top"><span class="tl-year">${t.year}</span><span class="tl-head">${t.head}</span></div>
            <div class="tl-body">${t.body}</div>
          </div>`).join('')}
      </div>`;
    }
    // 3. Open Source & Artifacts
    else if (/开源|OPEN SOURCE/i.test(rawTitle)) {
      const lines = content.split('\n').filter(l => l.trim().startsWith('-'));
      const osItems = [];
      for (const l of lines) {
        const m = l.match(/-\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+)\|\s*(.*)/);
        if (m) osItems.push({ name: m[1].trim(), url: m[2].trim(), desc: m[3].trim(), star: m[4].trim() });
      }
      sectionHtml = `
      <div class="os-grid">
        ${osItems.map(item => `
          <div class="os-item">
            <div class="os-name"><a href="${item.url}" target="_blank">${item.name}</a></div>
            <div class="os-desc">${item.desc}</div>
            <div class="os-star">${item.star}</div>
          </div>`).join('')}
      </div>`;
    }
    // 4. Skills & Expertise
    else if (/技能|专长|SKILLS/i.test(rawTitle)) {
      const lines = content.split('\n').filter(l => l.trim().startsWith('-'));
      const skills = [];
      for (const l of lines) {
        const m = l.match(/-\s*\*\*([^*]+)\*\*:\s*(.*)/);
        if (m) skills.push({ label: m[1].trim(), text: m[2].trim() });
      }
      sectionHtml = `
      <div class="resume-skills">
        ${skills.map(s => `
          <div class="skill-row">
            <div class="skill-label">${s.label}</div>
            <div class="skill-text">${s.text}</div>
          </div>`).join('')}
      </div>`;
    }
    // 5. Experience / Projects (Structured Role / Actions / Impact)
    else if (/经历|项目|EXPERIENCE|PROJECTS/i.test(rawTitle)) {
      const items = content.split(/\n(?=###\s+)/);
      const projHtmls = [];
      for (const item of items) {
        const itemTrim = item.trim();
        if (!itemTrim.startsWith('###')) {
          if (itemTrim) projHtmls.push(`<div class="resume-intro">${marked.parse(itemTrim)}</div>`);
          continue;
        }
        const headMatch = itemTrim.match(/^###\s+([^|\n]+)(?:\|\s*([^\n]+))?/);
        if (!headMatch) continue;
        const role = headMatch[1].trim();
        const company = headMatch[2] ? headMatch[2].trim() : '';

        let date = '';
        let badge = '';
        const dateMatch = itemTrim.match(/\*([^*]+)\*/);
        if (dateMatch) {
          const parts = dateMatch[1].split('|').map(p => p.trim());
          date = parts[0];
          if (parts[1]) badge = parts[1];
        }

        const lines = [];
        const bulletMatches = [...itemTrim.matchAll(/^[ \t]*-[ \t]+\*\*([^*]+)\*\*:\s*([^\n]+)/gm)];
        for (const bm of bulletMatches) {
          lines.push({ label: bm[1].trim(), text: bm[2].trim() });
        }

        // If not 3-part bullets, parse regular bullets
        let bulletsHtml = '';
        if (lines.length === 0) {
          const standardBullets = [...itemTrim.matchAll(/^[ \t]*-[ \t]+([^\n]+)/gm)];
          if (standardBullets.length > 0) {
            bulletsHtml = `<ul class="resume-bullets">${standardBullets.map(b => `<li>${b[1].trim()}</li>`).join('')}</ul>`;
          }
        }

        projHtmls.push(`
        <div class="resume-project">
          <div class="proj-head">
            <div class="proj-title-group">
              <span class="proj-name">${role}</span>
              ${company ? `<span class="proj-company">| ${company}</span>` : ''}
              ${badge ? `<span class="proj-badge">${badge}</span>` : ''}
            </div>
            ${date ? `<span class="proj-date">${date}</span>` : ''}
          </div>
          ${lines.length > 0 ? `
          <div class="proj-lines">
            ${lines.map(l => `
              <div class="proj-row">
                <div class="proj-label">${l.label}</div>
                <div class="proj-text">${l.text}</div>
              </div>`).join('')}
          </div>` : bulletsHtml}
        </div>`);
      }
      sectionHtml = projHtmls.join('\n');
    }
    // 6. Education
    else if (/教育|EDUCATION|学术/i.test(rawTitle)) {
      const items = content.split(/\n(?=###\s+)/);
      const eduHtmls = [];
      for (const item of items) {
        const itemTrim = item.trim();
        if (!itemTrim.startsWith('###')) continue;
        const headMatch = itemTrim.match(/^###\s+([^|\n]+)(?:\|\s*([^\n]+))?/);
        if (!headMatch) continue;
        const major = headMatch[1].trim();
        const school = headMatch[2] ? headMatch[2].trim() : '';
        let date = '';
        const dateMatch = itemTrim.match(/\*([^*]+)\*/);
        if (dateMatch) date = dateMatch[1].trim();
        const descMatches = [...itemTrim.matchAll(/^[ \t]*-[ \t]+([^\n]+)/gm)];
        const desc = descMatches.map(m => m[1].trim()).join('<br>');
        eduHtmls.push(`
        <div class="edu-item">
          <div class="edu-head">
            <div><span class="edu-major">${major}</span>${school ? ` <span class="edu-school">| ${school}</span>` : ''}</div>
            ${date ? `<span class="edu-date">${date}</span>` : ''}
          </div>
          ${desc ? `<div class="edu-desc">${desc}</div>` : ''}
        </div>`);
      }
      sectionHtml = eduHtmls.join('\n');
    }
    // 7. General Section (Summary, etc.)
    else {
      sectionHtml = `<div class="resume-text">${marked.parse(content)}</div>`;
    }

    outSections.push(`
    <section class="resume-section">
      <h2 class="resume-section-title">
        <span>${rawTitle}</span>
        ${subLabel ? `<span class="sub">${subLabel}</span>` : ''}
      </h2>
      ${sectionHtml}
    </section>`);
  }

  finalHtml = tplContent
    .replace('{{TITLE}}', `${displayName} - 简历`)
    .replace('{{STYLES}}', cssContent)
    .replace('{{CONTENT}}', `${headerHtml}\n${outSections.join('\n')}`);

// ==========================================
// 3. FORMAT: PAGE (Long-form Reading Article)
// ==========================================
} else {
  const cssPath = resolve(__dirname, '../templates/styles/chronicle.css');
  const tplPath = resolve(__dirname, '../templates/page.html');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const tplContent = readFileSync(tplPath, 'utf-8');

  // Block-level placeholders map
  const blockMap = new Map();
  let blockIdx = 0;

  function registerBlock(html) {
    const token = `CHRONICLE_BLOCK_${blockIdx++}_TOKEN`;
    blockMap.set(token, html);
    return `\n\n${token}\n\n`;
  }

  // Process upgrades
  if (annotations.upgrades && Array.isArray(annotations.upgrades)) {
    for (const u of annotations.upgrades) {
      if (u.type === 'epigraph' && u.target) {
        const epigraphHtml = `
<div class="chronicle-epigraph">
  <p>“${u.target}”</p>
  ${u.data?.source ? `<span class="epigraph-source">(${u.data.source})</span>` : ''}
</div>`;
        const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const bqRegex = new RegExp(`>\\s*\\*?${escaped}\\*?`, 'g');
        if (bqRegex.test(contentMd)) {
          contentMd = contentMd.replace(bqRegex, registerBlock(epigraphHtml));
        } else {
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(epigraphHtml));
        }
      } else if (u.type === 'section_break' && u.target) {
        const watermark = u.data?.watermark || u.target.slice(0, 1);
        const sectionHtml = `
<div class="chronicle-section-break">
  <span class="chronicle-section-break-watermark">${watermark}</span>
  <h2 class="chronicle-section-break-title">${u.target}</h2>
</div>`;
        const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const headingRegex = new RegExp(`#{1,6}\\s*${escaped}`, 'g');
        if (headingRegex.test(contentMd)) {
          contentMd = contentMd.replace(headingRegex, registerBlock(sectionHtml));
        } else {
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(sectionHtml));
        }
      } else if (u.type === 'chat_box' && u.data?.messages) {
        const chatHtml = `
<div class="chronicle-chat-box">
  ${u.data.messages.map(m => `
  <div class="chronicle-chat-message chronicle-chat-${m.speaker === 'right' ? 'right' : 'left'}">
    ${m.name ? `<div class="chronicle-chat-speaker">${m.name}</div>` : ''}
    <div class="chronicle-chat-body">${m.text}</div>
  </div>`).join('')}
</div>`;
        if (u.target) {
          const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(chatHtml));
        } else {
          contentMd += registerBlock(chatHtml);
        }
      } else if (u.type === 'dual_column' && u.data?.left && u.data?.right) {
        const leftHtml = marked.parse(u.data.left);
        const rightHtml = marked.parse(u.data.right);
        const dualHtml = `
<div class="chronicle-dual-column">
  <div class="chronicle-dual-col-left">${leftHtml}</div>
  <div class="chronicle-dual-col-right">${rightHtml}</div>
</div>`;
        if (u.target) {
          const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(dualHtml));
        } else {
          contentMd += registerBlock(dualHtml);
        }
      }
    }
  }

  const renderer = new marked.Renderer();
  renderer.paragraph = function({ text }) {
    return `<p class="chronicle-p">${text}</p>\n`;
  };
  renderer.image = function({ href, title, text }) {
    return `
<figure class="chronicle-figure">
  <img src="${href}" alt="${text || ''}" loading="lazy"${title ? ` title="${title}"` : ''}>
  ${text ? `<figcaption>${text}</figcaption>` : ''}
</figure>\n`;
  };
  renderer.hr = function() {
    return `
<div class="chronicle-section-break">
  <span class="chronicle-section-break-watermark">§</span>
</div>\n`;
  };

  marked.setOptions({ renderer, gfm: true, breaks: false });
  let renderedHtml = marked.parse(contentMd);

  for (const [token, htmlBlock] of blockMap.entries()) {
    const pTokenRegex = new RegExp(`<p(?:\\s+class="[^"]*")?>\\s*${token}\\s*<\\/p>`, 'g');
    if (pTokenRegex.test(renderedHtml)) {
      renderedHtml = renderedHtml.replace(pTokenRegex, htmlBlock);
    } else {
      renderedHtml = renderedHtml.replace(new RegExp(token, 'g'), htmlBlock);
    }
  }

  let heroHtml = '';
  if (docTitle) {
    heroHtml = `
<header class="chronicle-hero">
  <div class="chronicle-hero-bg-anchor"></div>
  <div class="chronicle-hero-content">
    <div class="chronicle-hero-hollow">${docTitle}</div>
    ${annotations.meta.subtitle ? `<div class="chronicle-hero-subtitle">${annotations.meta.subtitle}</div>` : ''}
    ${(annotations.meta.author || annotations.meta.date) ? `
      <div class="chronicle-hero-meta">
        ${annotations.meta.author ? `<span>${annotations.meta.author}</span>` : ''}
        ${annotations.meta.date ? `<span>${annotations.meta.date}</span>` : ''}
      </div>` : ''}
  </div>
</header>\n`;
  }

  let codaHtml = '';
  const codaUpgrade = annotations.upgrades?.find(u => u.type === 'coda');
  if (codaUpgrade || annotations.meta.coda) {
    const topText = codaUpgrade?.data?.framing_top || 'CHRONICLE';
    const focalChar = codaUpgrade?.data?.focal_char || annotations.meta.coda_char || '終';
    const bottomText = codaUpgrade?.data?.framing_bottom || 'FIN';
    codaHtml = `
<footer class="chronicle-coda">
  <div class="chronicle-coda-frame">${topText}</div>
  <div class="chronicle-coda-anchor">${focalChar}</div>
  <div class="chronicle-coda-frame">${bottomText}</div>
</footer>\n`;
  }

  const finalBodyContent = `
<div class="chronicle-prose">
  ${heroHtml}
  ${renderedHtml}
  ${codaHtml}
</div>`;

  const bodyClass = isCard ? 'aspect-card' : '';
  finalHtml = tplContent
    .replace('{{THEME}}', theme)
    .replace('{{TITLE}}', docTitle)
    .replace(/\{\{BODY_CLASS\}\}/g, bodyClass)
    .replace('{{ASPECT}}', aspect)
    .replace('{{STYLES}}', cssContent)
    .replace('{{CONTENT}}', finalBodyContent);
}

writeFileSync(resolve(outPath), finalHtml, 'utf-8');
console.log(`OK: Rendered Chronicle [${docFormat.toUpperCase()}${isCard ? ` (${aspect})` : ''}] -> ${outPath}`);

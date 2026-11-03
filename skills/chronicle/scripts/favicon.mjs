#!/usr/bin/env node
/**
 * Chronicle Design System - Favicon Generator
 * Produces austere, high-contrast, theme-adaptive publisher pressmark favicons:
 * - Solid silhouette & typographic mass (Publisher Pressmark / 印章标号)
 * - Classical bold serif glyph with solid fill (Georgia / Noto Serif SC)
 * - Automatic Dark / Light mode adaptation via prefers-color-scheme
 * - 100% crisp and readable down to 16x16 and 32x32 browser tabs
 *
 * Usage:
 *   node favicon.mjs [--char C] [--shape squircle|circle|square] [--out-dir site] [--png]
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const flags = {
  char: 'C',
  shape: 'squircle',
  outDir: 'site',
  png: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--char' && args[i + 1]) {
    flags.char = args[++i];
  } else if (arg === '--shape' && args[i + 1]) {
    flags.shape = args[++i];
  } else if (arg === '--out-dir' && args[i + 1]) {
    flags.outDir = args[++i];
  } else if (arg === '--png') {
    flags.png = true;
  }
}

const outDir = resolve(process.cwd(), flags.outDir);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

function generateSvg({ char, shape }) {
  let shapeElement = '';

  if (shape === 'circle') {
    shapeElement = `<circle cx="32" cy="32" r="28" class="badge-bg" /><circle cx="32" cy="32" r="28" class="badge-border" />`;
  } else if (shape === 'square') {
    shapeElement = `<rect x="4" y="4" width="56" height="56" rx="6" class="badge-bg" /><rect x="4" y="4" width="56" height="56" rx="6" class="badge-border" />`;
  } else {
    // squircle default (optimal for modern browser tabs and app icons)
    shapeElement = `<rect x="4" y="4" width="56" height="56" rx="14" class="badge-bg" /><rect x="4" y="4" width="56" height="56" rx="14" class="badge-border" />`;
  }

  // Optical sizing & baseline adjustment for Latin vs CJK
  const isCjk = /[\u4e00-\u9fa5]/.test(char);
  const fontSize = isCjk ? 34 : 40;
  const yOffset = isCjk ? 45 : 46;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <style>
      :root {
        --badge-fill: #16181d;
        --glyph-fill: #fbf9f6;
        --border-stroke: rgba(22, 24, 29, 0.16);
        --accent: #537791;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --badge-fill: #202530;
          --glyph-fill: #f0f2f5;
          --border-stroke: rgba(240, 242, 245, 0.28);
          --accent: #9cb4cd;
        }
      }
      .badge-bg {
        fill: var(--badge-fill);
      }
      .badge-border {
        fill: none;
        stroke: var(--border-stroke);
        stroke-width: 1.5;
      }
      .glyph-text {
        font-family: "Georgia", "Times New Roman", "Noto Serif SC", serif;
        font-weight: 700;
        font-size: ${fontSize}px;
        text-anchor: middle;
        fill: var(--glyph-fill);
        letter-spacing: -0.02em;
      }
    </style>
  </defs>
  ${shapeElement}
  <text x="32" y="${yOffset}" class="glyph-text">${char}</text>
</svg>`;
}

const svgContent = generateSvg(flags);
const svgPath = resolve(outDir, 'favicon.svg');
writeFileSync(svgPath, svgContent, 'utf-8');
console.log(`OK: Generated Chronicle Favicon SVG -> ${svgPath}`);

if (flags.png) {
  try {
    const puppeteer = await import('puppeteer-core');

    let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!chromePath) {
      const candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser'
      ];
      for (const p of candidates) {
        if (existsSync(p)) {
          chromePath = p;
          break;
        }
      }
    }

    if (!chromePath) {
      console.warn('WARN: Chrome executable not found, skipping PNG favicon generation.');
      process.exit(0);
    }

    const browser = await puppeteer.default.launch({
      executablePath: chromePath,
      headless: true,
      pipe: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;

    // Generate 32x32, 180x180 (Apple Touch Icon), and 512x512
    const sizes = [
      { name: 'favicon-32x32.png', size: 32 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'favicon-512x512.png', size: 512 }
    ];

    for (const { name, size } of sizes) {
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
      await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;"><img src="${dataUri}" width="${size}" height="${size}" style="display:block;" /></body></html>`);
      const targetPng = resolve(outDir, name);
      await page.screenshot({ path: targetPng, omitBackground: true });
      console.log(`OK: Generated ${name} (${size}x${size})`);
    }

    // Also write standard favicon.png (32x32)
    const defaultFaviconPng = resolve(outDir, 'favicon.png');
    await page.setViewport({ width: 32, height: 32, deviceScaleFactor: 1 });
    await page.screenshot({ path: defaultFaviconPng, omitBackground: true });
    console.log(`OK: Generated favicon.png (32x32)`);

    await browser.close();
  } catch (err) {
    console.warn('WARN: Could not generate PNG favicons:', err.message);
  }
}

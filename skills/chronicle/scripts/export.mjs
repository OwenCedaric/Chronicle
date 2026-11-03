#!/usr/bin/env node
/**
 * Chronicle Design System - High-Fidelity Exporter
 * Supports:
 *   - page: A4 Paged PDF with header/footer & 2x Full-page Long Image
 *   - social cards: Specified aspect ratios (3:4, 1:1, 16:9, 21:9, 9:16, 4:3, or custom W:H)
 *   - slides: 16:9 Landscape PDF & Presentation Preview
 *   - resume: 1:1 A4 Vector PDF & Preview
 *
 * Usage: node export.mjs <page.html> [--png out.png] [--pdf out.pdf] [--format page|slides|resume] [--aspect 3:4|1:1|16:9|21:9|all] [--width 1440] [--scale 2]
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, basename, dirname, extname } from 'path';
import { pathToFileURL } from 'url';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const flags = { width: null, scale: 2 };
const positional = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = args[i + 1];
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

const htmlFile = positional[0];
if (!htmlFile || (!flags.png && !flags.pdf)) {
  console.error('Usage: node export.mjs <page.html> [--png out.png] [--pdf out.pdf] [--format page|slides|resume] [--aspect 3:4|1:1|16:9|21:9|all] [--width 1440] [--scale 2]');
  process.exit(1);
}

const htmlContent = readFileSync(resolve(htmlFile), 'utf-8');

// Auto-detect format from HTML if not specified
let docFormat = flags.format || flags.type;
if (!docFormat) {
  if (htmlContent.includes('chronicle-deck')) {
    docFormat = 'slides';
  } else if (htmlContent.includes('chronicle-resume-sheet')) {
    docFormat = 'resume';
  } else {
    docFormat = 'page';
  }
}

// Auto-detect aspect ratio from HTML data-aspect if not passed
const aspectAttrMatch = htmlContent.match(/data-aspect="([^"]+)"/);
const aspectFlag = flags.aspect || (aspectAttrMatch ? aspectAttrMatch[1] : null);

// Aspect ratio dimension presets
const ASPECT_PRESETS = {
  '3:4': { width: 1080, height: 1440, name: '小红书/社交卡片 3:4' },
  '1:1': { width: 1200, height: 1200, name: '方形/微信卡片 1:1' },
  '16:9': { width: 1920, height: 1080, name: '横版/视频封面 16:9' },
  '21:9': { width: 2100, height: 900, name: '公众号头图 21:9' },
  '9:16': { width: 1080, height: 1920, name: '手机竖版海报 9:16' },
  '4:3': { width: 1440, height: 1080, name: '经典画幅 4:3' }
};

function resolveAspect(asp, customWidth = null) {
  if (!asp || asp === 'long' || asp === 'auto') return null;
  if (ASPECT_PRESETS[asp]) {
    const p = ASPECT_PRESETS[asp];
    if (customWidth) {
      return { width: customWidth, height: Math.round(customWidth * (p.height / p.width)), name: p.name };
    }
    return p;
  }
  const match = asp.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (match) {
    const wRatio = parseFloat(match[1]);
    const hRatio = parseFloat(match[2]);
    const w = customWidth || (wRatio >= hRatio ? 1920 : 1080);
    const h = Math.round(w * (hRatio / wRatio));
    return { width: w, height: h, name: `自定义比例 ${asp}` };
  }
  return null;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const executablePath = findChrome();
if (!executablePath) {
  console.error('ERROR: Could not find Google Chrome or Chromium executable. Set CHROME_PATH environment variable.');
  process.exit(1);
}

const deviceScaleFactor = Number(flags.scale || 2);

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    pipe: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--font-render-hinting=none',
      '--enable-font-antialiasing'
    ]
  });

  try {
    const page = await browser.newPage();
    const fileUrl = pathToFileURL(resolve(htmlFile)).href;

    // Helper: wait for fonts
    async function waitFonts() {
      await page.evaluate(async () => {
        if (document.fonts) {
          await document.fonts.ready;
        }
      });
    }

    // PNG Export
    if (flags.png) {
      const baseOutPng = flags.png === true ? htmlFile.replace(/\.html$/, '.png') : flags.png;
      const outDir = dirname(resolve(baseOutPng));
      const stem = basename(baseOutPng, extname(baseOutPng));

      // Batch all social cards mode
      if (aspectFlag === 'all') {
        const aspectsToRender = ['3:4', '1:1', '21:9', '16:9'];
        for (const asp of aspectsToRender) {
          const dim = ASPECT_PRESETS[asp];
          await page.setViewport({ width: dim.width, height: dim.height, deviceScaleFactor });
          await page.goto(fileUrl, { waitUntil: 'networkidle0' });
          await waitFonts();

          const targetFile = resolve(outDir, `${stem}-${asp.replace(':', '-')}.png`);
          await page.screenshot({
            path: targetFile,
            clip: { x: 0, y: 0, width: dim.width, height: dim.height }
          });
          console.log(`OK: Exported [${dim.name}] PNG (${dim.width}x${dim.height}px @ ${deviceScaleFactor}x) -> ${targetFile}`);
        }
      } else {
        const aspectDim = resolveAspect(aspectFlag, Number(flags.width) || null);
        if (aspectDim) {
          // Specific Aspect Ratio Mode
          await page.setViewport({ width: aspectDim.width, height: aspectDim.height, deviceScaleFactor });
          await page.goto(fileUrl, { waitUntil: 'networkidle0' });
          await waitFonts();

          await page.screenshot({
            path: resolve(baseOutPng),
            clip: { x: 0, y: 0, width: aspectDim.width, height: aspectDim.height }
          });
          console.log(`OK: Exported [${aspectDim.name}] PNG (${aspectDim.width}x${aspectDim.height}px @ ${deviceScaleFactor}x) -> ${baseOutPng}`);
        } else {
          // Standard Long Image Mode
          let width = Number(flags.width);
          if (!width) {
            if (docFormat === 'slides') width = 1920;
            else if (docFormat === 'resume') width = 1200;
            else width = flags.mobile ? 430 : 1440;
          }
          await page.setViewport({ width, height: 900, deviceScaleFactor });
          await page.goto(fileUrl, { waitUntil: 'networkidle0' });
          await waitFonts();

          await page.screenshot({
            path: resolve(baseOutPng),
            fullPage: true,
            type: 'png'
          });
          console.log(`OK: Exported [${docFormat.toUpperCase()}] Long PNG (${width}px @ ${deviceScaleFactor}x) -> ${baseOutPng}`);
        }
      }
    }

    // PDF Export
    if (flags.pdf) {
      const outPdf = flags.pdf === true ? htmlFile.replace(/\.html$/, '.pdf') : flags.pdf;
      await page.goto(fileUrl, { waitUntil: 'networkidle0' });
      await waitFonts();
      await page.emulateMediaType('print');

      if (docFormat === 'slides') {
        await page.pdf({
          path: resolve(outPdf),
          width: '16in',
          height: '9in',
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: 0, bottom: 0, left: 0, right: 0 }
        });
      } else if (docFormat === 'resume') {
        await page.pdf({
          path: resolve(outPdf),
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: '16mm', bottom: '16mm', left: '20mm', right: '20mm' }
        });
      } else {
        await page.pdf({
          path: resolve(outPdf),
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: `
            <div style="font-family: 'Noto Serif SC', Songti SC, serif; font-size: 8px; letter-spacing: 0.18em; color: #757d8a; width: 100%; text-align: center; padding-top: 10mm; -webkit-print-color-adjust: exact;">
              CHRONICLE
            </div>`,
          footerTemplate: `
            <div style="font-family: 'Noto Serif SC', Songti SC, serif; font-size: 8px; color: #757d8a; width: 100%; text-align: center; padding-bottom: 10mm; -webkit-print-color-adjust: exact;">
              <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>`,
          margin: {
            top: '24mm',
            bottom: '24mm',
            left: '20mm',
            right: '20mm'
          }
        });
      }
      console.log(`OK: Exported [${docFormat.toUpperCase()}] vector PDF -> ${outPdf}`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('ERROR: Export failed:', err);
  process.exit(1);
});

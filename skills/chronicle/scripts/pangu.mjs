/**
 * Chronicle Pangu Spacing
 * Enforces Constraint #7: CJK-Latin Mixed Typesetting (standard space between CJK and Latin letters/numerals).
 * Skips code blocks, inline code, and URLs.
 */

const CJK = '\\u2e80-\\u2eff\\u2f00-\\u2fdf\\u3040-\\u309f\\u30a0-\\u30fa\\u30fc-\\u30ff\\u3100-\\u312f\\u3200-\\u32ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
const LATIN = 'A-Za-z0-9';

const CJK_LATIN = new RegExp(`([${CJK}])([${LATIN}])`, 'g');
const LATIN_CJK = new RegExp(`([${LATIN}])([${CJK}])`, 'g');

export function spacing(text) {
  if (!text) return '';

  // Preserve code blocks and inline code
  const placeholders = [];
  let masked = text.replace(/(```[\s\S]*?```|`[^`]+`|<[^>]+>|\[[^\]]+\]\([^\)]+\))/g, (match) => {
    placeholders.push(match);
    return `___CHRONICLE_PH_${placeholders.length - 1}___`;
  });

  // Apply spacing
  masked = masked.replace(CJK_LATIN, '$1 $2');
  masked = masked.replace(LATIN_CJK, '$1 $2');

  // Restore placeholders
  return masked.replace(/___CHRONICLE_PH_(\d+)___/g, (_, idx) => placeholders[Number(idx)]);
}

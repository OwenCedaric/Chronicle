/**
 * Chronicle Design System - Shared CLI Argument Parser
 * Extracts --key value flags and positional arguments from process.argv.
 *
 * @param {Object} [defaults] - Default values for flags (e.g. { outDir: 'output', theme: 'light' })
 * @returns {{ flags: Object, positional: string[] }}
 */
export function parseArgs(defaults = {}) {
  const rawArgs = process.argv.slice(2);
  const flags = { ...defaults };
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

  return { flags, positional };
}

import { readFileSync } from 'node:fs';

/**
 * Structural sanity check for the stylesheet.
 *
 * Webpack does catch a malformed stylesheet, but only at build time and with a
 * stack trace that points at line 1 no matter where the real problem is. This
 * reports the actual line, and runs as part of `npm run typecheck:offline` so
 * an editing mistake is caught before a deploy rather than during one.
 *
 * No dependencies — it strips comments and strings, then walks the braces.
 */
const FILE = process.argv[2] ?? 'app/globals.css';
const source = readFileSync(FILE, 'utf8');

// Blank out comments and quoted strings so their braces are not counted,
// preserving newlines so line numbers stay accurate.
const blanked = source
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/'(?:[^'\\\n]|\\.)*'/g, (m) => m.replace(/[^\n]/g, ' '));

const problems = [];
const stack = [];
let line = 1;

for (let i = 0; i < blanked.length; i++) {
  const ch = blanked[i];
  if (ch === '\n') {
    line++;
    continue;
  }
  if (ch === '{') {
    // Nesting is legitimate inside at-rules (@media, @supports, @keyframes)
    // and nowhere else in plain CSS.
    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      if (!parent.atRule) {
        problems.push(
          `line ${line}: block opened inside a plain rule started on line ${parent.line} ` +
            `— usually a duplicated selector or a missing "}"`
        );
      }
    }
    const head = blanked.slice(0, i).split('\n').pop() ?? '';
    stack.push({ line, atRule: /@[\w-]+/.test(head) });
    continue;
  }
  if (ch === '}') {
    if (stack.length === 0) problems.push(`line ${line}: unmatched "}"`);
    else stack.pop();
  }
}

for (const open of stack) {
  problems.push(`line ${open.line}: block was never closed`);
}

if (problems.length > 0) {
  console.error(`[check-css] ${FILE} has ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const rules = (blanked.match(/{/g) ?? []).length;
console.log(`[check-css] ${FILE} OK — ${rules} blocks, braces balanced.`);

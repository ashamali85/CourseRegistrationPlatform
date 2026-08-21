import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every class name used in a component must have a rule in globals.css.
 *
 * Deleting a CSS rule that is still referenced is silent: the build passes,
 * types pass, and the element simply renders unstyled — which is how a resize
 * handle became invisible after an unrelated edit to a neighbouring rule.
 * Nothing else in the toolchain catches it, so this does.
 */
const CSS_FILE = 'app/globals.css';
const ROOTS = ['app', 'components'];

/** Class names that legitimately have no rule of their own. */
const IGNORED = new Set(['ltr-text']);

const css = readFileSync(CSS_FILE, 'utf8');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

const used = new Map();

for (const file of ROOTS.flatMap(walk)) {
  const source = readFileSync(file, 'utf8');

  const record = (raw) => {
    for (const name of raw.split(/\s+/)) {
      // Template holes leave fragments behind; only keep plain class tokens.
      if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) continue;
      if (!used.has(name)) used.set(name, file);
    }
  };

  for (const m of source.matchAll(/className="([^"]*)"/g)) record(m[1]);
  for (const m of source.matchAll(/className=\{`([^`]*)`\}/g)) {
    record(m[1].replace(/\$\{[^}]*\}/g, ' '));
  }
  // Class names assembled in arrays, e.g. ['calendar-day', cond ? 'x' : '']
  for (const m of source.matchAll(/'([a-z][a-z0-9-]*)'/g)) {
    if (/-/.test(m[1]) && css.includes('.' + m[1])) record(m[1]);
  }
}

const missing = [...used.entries()]
  .filter(([name]) => !IGNORED.has(name))
  .filter(([name]) => !new RegExp(`\\.${name}(?![a-z0-9-])`).test(css));

if (missing.length > 0) {
  console.error(`[check-classes] ${missing.length} class(es) used but not styled:`);
  for (const [name, file] of missing) console.error(`  .${name}  (${file})`);
  console.error('[check-classes] Either the rule was deleted, or the class is a typo.');
  process.exit(1);
}

console.log(`[check-classes] OK — ${used.size} classes, all styled.`);

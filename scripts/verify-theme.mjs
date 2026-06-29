#!/usr/bin/env node
// Validate composed themes structurally, then run `shopify theme check` if available.
//   npm run verify            verify every built theme
//   npm run verify -- <slug>  verify one
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { THEMES, readJSON, listThemes, sectionTypesInJSON } from './lib.mjs';

const REQUIRED = [
  'layout/theme.liquid',
  'config/settings_schema.json',
  'config/settings_data.json',
  'templates/index.json',
  'templates/product.json',
  'templates/collection.json',
  'templates/cart.json',
  'templates/page.json',
  'templates/404.json',
  'templates/search.json',
  'templates/blog.json',
  'templates/article.json',
  'templates/password.json',
  'templates/gift_card.liquid',
  'layout/password.liquid',
];

function verify(slug) {
  const dist = join(THEMES, slug, 'dist');
  const errors = [];
  if (!existsSync(dist)) return [`themes/${slug}/dist missing — run: npm run build -- ${slug}`];

  // 1. Required files.
  for (const rel of REQUIRED) {
    if (!existsSync(join(dist, rel))) errors.push(`missing ${rel}`);
  }

  // 2. Available section types.
  const sectionsDir = join(dist, 'sections');
  const haveSections = new Set(
    existsSync(sectionsDir)
      ? readdirSync(sectionsDir).filter((f) => f.endsWith('.liquid')).map((f) => f.replace('.liquid', ''))
      : []
  );

  // 3. Every section `type` referenced in templates + section groups exists, and JSON parses.
  const jsonFiles = [];
  for (const dir of ['templates', 'sections']) {
    const d = join(dist, dir);
    if (existsSync(d)) {
      for (const f of readdirSync(d)) {
        if (f.endsWith('.json') && statSync(join(d, f)).isFile()) jsonFiles.push(join(dir, f));
      }
    }
  }
  for (const rel of jsonFiles) {
    let obj;
    try {
      obj = readJSON(join(dist, rel));
    } catch (e) {
      errors.push(`invalid JSON: ${rel} (${e.message})`);
      continue;
    }
    for (const type of sectionTypesInJSON(obj)) {
      if (!haveSections.has(type)) errors.push(`${rel} references section "${type}" with no sections/${type}.liquid`);
    }
  }

  // 4. Section groups referenced by layout exist.
  const layout = readFileSync(join(dist, 'layout/theme.liquid'), 'utf8');
  for (const m of layout.matchAll(/\{%-?\s*sections\s+'([^']+)'/g)) {
    if (!existsSync(join(sectionsDir, `${m[1]}.json`))) errors.push(`layout references section group "${m[1]}" with no sections/${m[1]}.json`);
  }

  return errors;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const targets = args.length ? args : listThemes();

if (targets.length === 0) {
  console.error('No themes found. Create one: npm run new -- <slug> "Name" [preset]');
  process.exit(1);
}

let failed = 0;
for (const slug of targets) {
  const errors = verify(slug);
  if (errors.length) {
    failed++;
    console.log(`✗ ${slug}`);
    for (const e of errors) console.log(`    ${e}`);
  } else {
    console.log(`✓ ${slug}  (structure OK)`);
  }
}

// Optional: Shopify Theme Check (the real linter) if the CLI is installed.
let hasCLI = false;
try {
  execFileSync('shopify', ['version'], { stdio: 'ignore' });
  hasCLI = true;
} catch {}
if (hasCLI) {
  for (const slug of targets) {
    const dist = join(THEMES, slug, 'dist');
    if (!existsSync(dist)) continue;
    console.log(`\n--- shopify theme check: ${slug} ---`);
    try {
      execFileSync('shopify', ['theme', 'check', '--path', dist], { stdio: 'inherit' });
    } catch {
      failed++;
    }
  }
} else {
  console.log('\n(Install Shopify CLI for full `theme check`: https://shopify.dev/docs/api/shopify-cli)');
}

process.exit(failed ? 1 : 0);

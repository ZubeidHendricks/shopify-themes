#!/usr/bin/env node
// Create a new theme in the factory.
//   npm run new -- <slug> "Display Name" [preset]
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { THEMES, PRESETS, readJSON } from './lib.mjs';

const [slug, name, preset = 'minimal-mono'] = process.argv.slice(2);

if (!slug || !name) {
  console.error('Usage: npm run new -- <slug> "Display Name" [preset]');
  console.error('Presets: ' + readdirSync(PRESETS).map((f) => f.replace('.json', '')).join(', '));
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug must be kebab-case: "${slug}"`);
  process.exit(1);
}

const presetPath = join(PRESETS, `${preset}.json`);
if (!existsSync(presetPath)) {
  console.error(`Unknown preset "${preset}". Available: ` + readdirSync(PRESETS).map((f) => f.replace('.json', '')).join(', '));
  process.exit(1);
}

const dir = join(THEMES, slug);
if (existsSync(dir)) {
  console.error(`Theme "${slug}" already exists at themes/${slug}`);
  process.exit(1);
}

// Source of truth for a theme = just its config + optional overrides/.
mkdirSync(join(dir, 'overrides'), { recursive: true });

const config = {
  slug,
  name,
  preset,
  // Per-theme setting overrides applied on top of the preset.
  settings: {},
};
writeFileSync(join(dir, 'theme.config.json'), JSON.stringify(config, null, 2) + '\n');
writeFileSync(
  join(dir, 'overrides', '.gitkeep'),
  '# Drop section/template files here to override the shared core for this theme.\n'
);

const p = readJSON(presetPath);
console.log(`Created themes/${slug} (preset: ${preset} — ${p.description || p.name})`);
console.log(`Next: npm run build -- ${slug}   then upload themes/${slug}/dist/`);

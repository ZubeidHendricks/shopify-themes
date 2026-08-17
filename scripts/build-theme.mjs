#!/usr/bin/env node
// Compose a self-contained, uploadable theme from the shared core + preset + overrides.
//   npm run build -- <slug>      build one theme
//   npm run build:all            build every theme
import { rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { CORE, KIT, BASE, PRESETS, THEMES, readJSON, copyTree, listThemes } from './lib.mjs';
import { localizeThemeSchemas } from './localize-schemas.mjs';

function build(slug) {
  const themeDir = join(THEMES, slug);
  const configPath = join(themeDir, 'theme.config.json');
  if (!existsSync(configPath)) throw new Error(`No theme.config.json in themes/${slug}`);

  const config = readJSON(configPath);
  const preset = readJSON(join(PRESETS, `${config.preset}.json`));
  const dist = join(themeDir, 'dist');

  // 1. Clean compose target.
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  // 2. Shared core (layout, config/settings_schema, locales, snippets, assets).
  copyTree(CORE, dist);
  // 3. Section library.
  copyTree(join(KIT, 'sections'), join(dist, 'sections'));
  copyTree(join(KIT, 'snippets'), join(dist, 'snippets'));
  // 4. Base theme templates + default settings_data.
  copyTree(join(BASE, 'templates'), join(dist, 'templates'));
  copyTree(join(BASE, 'config'), join(dist, 'config'));

  // 5. Apply preset + per-theme setting overrides into settings_data.json.
  const dataPath = join(dist, 'config', 'settings_data.json');
  const data = readJSON(dataPath);
  data.current = { ...data.current, ...preset.settings, ...config.settings };
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');

  // ...and the theme name into settings_schema theme_info.
  const schemaPath = join(dist, 'config', 'settings_schema.json');
  const schema = readJSON(schemaPath);
  const info = schema.find((s) => s.name === 'theme_info');
  if (info) info.theme_name = config.name || preset.theme_name;
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');

  // 6. Per-theme overrides overlay (custom sections/templates win).
  copyTree(join(themeDir, 'overrides'), dist);

  // 6b. Swap schema copy for `t:` keys and emit locales/en.default.schema.json.
  //     Runs after overrides so per-theme sections are localized too.
  const schemaKeys = localizeThemeSchemas(dist);

  // Theme Check config (local lint only — excluded from the upload zip).
  // ValidScopedCSSClass is off by design: shared looks live in base.css (the
  // restyle seam), so classes are intentionally used across sections.
  writeFileSync(
    join(dist, '.theme-check.yml'),
    'extends: theme-check:recommended\nValidScopedCSSClass:\n  enabled: false\n'
  );

  // 7. Zip for manual upload (Online Store > Themes > Upload).
  try {
    const zip = join(themeDir, `${slug}.zip`);
    rmSync(zip, { force: true });
    execFileSync('zip', ['-r', '-q', zip, '.', '-x', '.*'], { cwd: dist });
    console.log(`  built themes/${slug}/dist  +  ${slug}.zip  (preset: ${config.preset}, ${schemaKeys} schema strings localized)`);
  } catch {
    console.log(`  built themes/${slug}/dist  (zip skipped — 'zip' not found, ${schemaKeys} schema strings localized)`);
  }
}

const args = process.argv.slice(2);
const targets = args.includes('--all') ? listThemes() : args.filter((a) => !a.startsWith('--'));

if (targets.length === 0) {
  console.error('Usage: npm run build -- <slug>   |   npm run build:all');
  process.exit(1);
}

console.log(`Building ${targets.length} theme(s):`);
for (const slug of targets) build(slug);

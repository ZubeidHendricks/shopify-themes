// Schema localization pass.
//
// Theme Store review requires section/settings schema strings to be translation
// keys resolved from locales/*.schema.json — not hardcoded English. Doing that by
// hand makes the source unreadable, so this runs at BUILD time instead: authors
// keep writing plain English in packages/, and compose emits `t:` keys plus a
// generated en.default.schema.json into dist/.
//
// Not one of the ~98 commercial themes surveyed in docs/theme-teardown.md does
// this (0/98 used `t:` keys), so it is both a review gate and a differentiator.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Keys whose values are human-facing copy and should become translation keys.
// `default` is deliberately excluded: an unresolved default would render the raw
// key as storefront content.
const TRANSLATABLE = ['label', 'info', 'content', 'name'];

function setDeep(target, path, value) {
  let node = target;
  for (const part of path.slice(0, -1)) {
    node[part] = node[part] || {};
    node = node[part];
  }
  node[path[path.length - 1]] = value;
}

// Walk a settings array, swapping copy for `t:` keys and recording the English.
function localizeSettings(settings, basePath, catalog) {
  if (!Array.isArray(settings)) return;
  settings.forEach((setting, index) => {
    if (!setting || typeof setting !== 'object') return;
    // header/paragraph carry copy but have no id — key them by position.
    const id = setting.id || `${setting.type}__${index + 1}`;
    for (const field of TRANSLATABLE) {
      if (typeof setting[field] !== 'string' || setting[field] === '') continue;
      const path = [...basePath, 'settings', id, field];
      setDeep(catalog, path, setting[field]);
      setting[field] = `t:${path.join('.')}`;
    }
    if (Array.isArray(setting.options)) {
      setting.options.forEach((option, optionIndex) => {
        if (typeof option?.label !== 'string') return;
        const key = option.value || `option__${optionIndex + 1}`;
        const path = [...basePath, 'settings', id, 'options', String(key)];
        setDeep(catalog, path, option.label);
        option.label = `t:${path.join('.')}`;
      });
    }
  });
}

function localizeSchema(schema, basePath, catalog) {
  if (typeof schema.name === 'string') {
    const path = [...basePath, 'name'];
    setDeep(catalog, path, schema.name);
    schema.name = `t:${path.join('.')}`;
  }
  localizeSettings(schema.settings, basePath, catalog);

  for (const block of schema.blocks || []) {
    if (!block || typeof block !== 'object' || !block.type) continue;
    const blockPath = [...basePath, 'blocks', block.type];
    if (typeof block.name === 'string') {
      setDeep(catalog, [...blockPath, 'name'], block.name);
      block.name = `t:${[...blockPath, 'name'].join('.')}`;
    }
    localizeSettings(block.settings, blockPath, catalog);
  }

  (schema.presets || []).forEach((preset, index) => {
    if (typeof preset?.name !== 'string') return;
    const path = [...basePath, 'presets', String(index), 'name'];
    setDeep(catalog, path, preset.name);
    preset.name = `t:${path.join('.')}`;
  });
}

const SCHEMA_BLOCK = /\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/;

export function localizeThemeSchemas(dist) {
  const catalog = {};

  // 1. Section schemas.
  const sectionsDir = join(dist, 'sections');
  if (existsSync(sectionsDir)) {
    for (const file of readdirSync(sectionsDir)) {
      if (!file.endsWith('.liquid')) continue;
      const path = join(sectionsDir, file);
      const source = readFileSync(path, 'utf8');
      const match = source.match(SCHEMA_BLOCK);
      if (!match) continue;

      let schema;
      try {
        schema = JSON.parse(match[1]);
      } catch {
        throw new Error(`Invalid JSON in {% schema %} of sections/${file}`);
      }

      localizeSchema(schema, ['sections', file.replace(/\.liquid$/, '')], catalog);
      const rendered = `{% schema %}\n${JSON.stringify(schema, null, 2)}\n{% endschema %}`;
      writeFileSync(path, source.replace(SCHEMA_BLOCK, rendered));
    }
  }

  // 2. Global settings schema (theme_info is metadata, never translated).
  const settingsPath = join(dist, 'config', 'settings_schema.json');
  if (existsSync(settingsPath)) {
    const groups = JSON.parse(readFileSync(settingsPath, 'utf8'));
    for (const group of groups) {
      if (!group || group.name === 'theme_info') continue;
      const slug = String(group.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      localizeSchema(group, ['settings_schema', slug], catalog);
    }
    writeFileSync(settingsPath, JSON.stringify(groups, null, 2) + '\n');
  }

  // 3. Emit the catalog. Shopify resolves `t:` keys from *.schema.json only.
  writeFileSync(
    join(dist, 'locales', 'en.default.schema.json'),
    JSON.stringify(catalog, null, 2) + '\n'
  );

  return countLeaves(catalog);
}

function countLeaves(node) {
  if (typeof node === 'string') return 1;
  return Object.values(node).reduce((sum, child) => sum + countLeaves(child), 0);
}

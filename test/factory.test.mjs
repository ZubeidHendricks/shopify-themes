import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, THEMES, KIT, readJSON, sectionTypesInJSON } from '../scripts/lib.mjs';

const SLUG = 'zz-test-theme';
const dir = join(THEMES, SLUG);

function cleanup() {
  rmSync(dir, { recursive: true, force: true });
}

test.after(cleanup);

test('every section .liquid has a valid {% schema %}', () => {
  const dir = join(KIT, 'sections');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.liquid'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    const m = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
    assert.ok(m, `${f} missing {% schema %}`);
    assert.doesNotThrow(() => JSON.parse(m[1]), `${f} has invalid schema JSON`);
  }
});

test('new -> build -> verify pipeline produces an uploadable theme', () => {
  cleanup();
  execFileSync('node', ['scripts/new-theme.mjs', SLUG, 'Test Theme', 'warm-boutique'], { cwd: ROOT });
  assert.ok(existsSync(join(dir, 'theme.config.json')), 'config created');

  execFileSync('node', ['scripts/build-theme.mjs', SLUG], { cwd: ROOT });
  const dist = join(dir, 'dist');
  assert.ok(existsSync(join(dist, 'layout/theme.liquid')), 'layout composed');
  assert.ok(existsSync(join(dist, 'templates/index.json')), 'index template composed');

  // Preset applied: warm-boutique accent color landed in settings_data.
  const data = readJSON(join(dist, 'config/settings_data.json'));
  assert.equal(data.current.color_accent, '#b07d56', 'preset settings applied');

  // Theme name applied to schema.
  const schema = readJSON(join(dist, 'config/settings_schema.json'));
  assert.equal(schema.find((s) => s.name === 'theme_info').theme_name, 'Test Theme');

  // verify exits 0.
  execFileSync('node', ['scripts/verify-theme.mjs', SLUG], { cwd: ROOT });
});

test('index.json only references sections that exist', () => {
  const index = readJSON(join(ROOT, 'templates/base-theme/templates/index.json'));
  const have = new Set(
    readdirSync(join(KIT, 'sections')).filter((f) => f.endsWith('.liquid')).map((f) => f.replace('.liquid', ''))
  );
  for (const type of sectionTypesInJSON(index)) {
    assert.ok(have.has(type), `index references missing section "${type}"`);
  }
});

test('built theme localizes every schema string and ships a schema catalog', () => {
  const dist = join(THEMES, 'aurora-mono', 'dist');
  assert.ok(existsSync(dist), 'run `npm run build:all` before this test');

  // Theme Store review rejects hardcoded copy in schemas — every label/info/
  // content/name must be a `t:` key. See docs/theme-teardown.md: 0 of the ~98
  // commercial themes surveyed do this, so it is easy to regress on.
  const offenders = [];
  for (const f of readdirSync(join(dist, 'sections')).filter((f) => f.endsWith('.liquid'))) {
    const src = readFileSync(join(dist, 'sections', f), 'utf8');
    const m = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
    if (!m) continue;
    const schema = JSON.parse(m[1]);

    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      for (const key of ['label', 'info', 'content', 'name']) {
        const value = node[key];
        if (typeof value === 'string' && !value.startsWith('t:')) {
          offenders.push(`sections/${f}: ${key} = ${JSON.stringify(value)}`);
        }
      }
      Object.values(node).forEach(walk);
    };
    walk(schema);
  }
  assert.deepEqual(offenders, [], `unlocalized schema strings:\n${offenders.join('\n')}`);

  // ...and the keys must actually resolve against the generated catalog.
  const catalog = readJSON(join(dist, 'locales', 'en.default.schema.json'));
  const resolve = (key) => key.slice(2).split('.').reduce((n, p) => (n == null ? n : n[p]), catalog);
  const src = readFileSync(join(dist, 'sections', 'trust-badges.liquid'), 'utf8');
  const schema = JSON.parse(src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/)[1]);
  assert.equal(resolve(schema.name), 'Trust badges');
  assert.equal(typeof resolve(schema.blocks[0].name), 'string');
});

test('global settings surface stays in the Theme Store band', () => {
  // Pipeline ships 50, Icon 78, Impulse 119; the ThemeForest bulk runs 257-1177
  // and is unusable in the editor. Keep the factory in the healthy range.
  const groups = readJSON(join(KIT, '..', 'theme-core', 'config', 'settings_schema.json'));
  const count = groups
    .filter((g) => g.name !== 'theme_info')
    .flatMap((g) => g.settings || [])
    .filter((s) => s.type !== 'header' && s.type !== 'paragraph').length;
  assert.ok(count >= 40, `only ${count} global settings — below what buyers expect`);
  assert.ok(count <= 140, `${count} global settings — drifting toward editor bloat`);
});

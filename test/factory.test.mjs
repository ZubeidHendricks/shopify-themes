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

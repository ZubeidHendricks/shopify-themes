// Shared paths + helpers for the theme factory.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..');
export const CORE = join(ROOT, 'packages', 'theme-core');
export const KIT = join(ROOT, 'packages', 'section-kit');
export const BASE = join(ROOT, 'templates', 'base-theme');
export const PRESETS = join(ROOT, 'templates', 'presets');
export const THEMES = join(ROOT, 'themes');

// Folders Shopify recognizes; copied verbatim during compose.
export const THEME_FOLDERS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates', 'blocks'];

export function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function copyTree(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (entry.startsWith('.')) continue; // skip .gitkeep, .DS_Store, etc.
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) copyTree(s, d);
    else copyFileSync(s, d);
  }
}

export function listThemes() {
  if (!existsSync(THEMES)) return [];
  return readdirSync(THEMES).filter((name) => existsSync(join(THEMES, name, 'theme.config.json')));
}

// Collect every `type` referenced in a section group / template JSON.
export function sectionTypesInJSON(obj) {
  const types = new Set();
  const sections = obj.sections || {};
  for (const key of Object.keys(sections)) {
    if (sections[key]?.type) types.add(sections[key].type);
  }
  return types;
}

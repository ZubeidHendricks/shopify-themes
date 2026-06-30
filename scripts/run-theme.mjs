#!/usr/bin/env node
// Build a theme fresh, then run a Shopify CLI theme command against its dist.
//   node scripts/run-theme.mjs dev  <slug> [--store=x ...]
//   node scripts/run-theme.mjs push <slug> [--unpublished ...]
// Wired as npm scripts: `npm run dev -- <slug>`, `npm run push -- <slug>`.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { ROOT, THEMES, listThemes } from './lib.mjs';

const [command, slug, ...rest] = process.argv.slice(2);

if (!command || !slug) {
  console.error('Usage: npm run <dev|push> -- <slug> [extra shopify flags]');
  console.error('Themes: ' + (listThemes().join(', ') || '(none — npm run new -- <slug> "Name")'));
  process.exit(1);
}

if (!existsSync(join(THEMES, slug, 'theme.config.json'))) {
  console.error(`No theme "${slug}". Available: ` + (listThemes().join(', ') || '(none)'));
  process.exit(1);
}

// Ensure the Shopify CLI (user-local npm prefix) is reachable.
const env = { ...process.env, PATH: `${join(homedir(), '.npm-global', 'bin')}:${process.env.PATH}` };

// 1. Always build first so dist reflects the latest source.
const build = spawnSync('node', ['scripts/build-theme.mjs', slug], { cwd: ROOT, stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status || 1);

// 2. Hand off to the Shopify CLI (interactive: store auth, hot reload, etc.).
const dist = join(THEMES, slug, 'dist');
const args = ['theme', command, '--path', dist, ...rest];
console.log(`\n$ shopify ${args.join(' ')}\n`);
const cli = spawnSync('shopify', args, { cwd: ROOT, stdio: 'inherit', env });

if (cli.error && cli.error.code === 'ENOENT') {
  console.error('\nShopify CLI not found on PATH. Install: npm install -g @shopify/cli --prefix ~/.npm-global');
  console.error('Then ensure ~/.npm-global/bin is on your PATH.');
  process.exit(1);
}
process.exit(cli.status ?? 0);

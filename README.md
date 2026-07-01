# Shopify Theme Factory

A monorepo for shipping a **portfolio of Online Store 2.0 Liquid themes on a shared
core** — the same "factory" model as the Shopify *app* factory, AppFactoryKit (iOS),
and wp-plugins, adapted to storefront themes.

## The distribution reality (read first)

Unlike WordPress plugins, you **cannot mass-upload to the Shopify Theme Store**. It is
curated: every theme is human-reviewed, must be substantially distinct, and must pass the
[Theme Store Requirements](https://shopify.dev/docs/storefronts/themes/store/requirements)
(OS 2.0, performance budgets, accessibility, `theme-check` clean). So the factory targets
**two channels**:

| Channel | Curation | Volume play |
| --- | --- | --- |
| **Theme Store** | Strict review | 1–3 *flagship* themes, slow cadence |
| **Off-store** — own site, Gumroad, ThemeForest, agency reuse + **section bundles** | None | The real volume: many preset variants & section packs |

Either way the engine is the same: **one shared core → many self-contained, uploadable themes.**

## Why the shared-core build step

A Shopify theme must be a **flat, self-contained directory** (`assets/ config/ layout/
locales/ sections/ snippets/ templates/ blocks/`). There's no cross-theme import system.
So "shared core" is a **build step**: the generator stamps a full theme by composing
core + section library + base templates + a style preset.

```
packages/
  theme-core/     Shared layout, settings_schema, color/type/layout settings,
                  CSS-variable seam, locales, base.css, meta tags.   (copied verbatim)
  section-kit/    Reusable OS 2.0 sections + snippets: header/footer, hero,
                  featured-collection, image-with-text, multicolumn, newsletter,
                  and main-* sections for product/collection/cart/search/page/404.
templates/
  base-theme/     JSON templates (index, product, collection, cart, …) + default
                  settings_data. The skeleton every theme starts from.
  presets/        Style variants as JSON (colors, fonts, radii, spacing). The volume lever.
scripts/
  new-theme.mjs   npm run new -- <slug> "Name" [preset]
  build-theme.mjs Compose core + base + preset (+ overrides) -> themes/<slug>/dist + .zip
  verify-theme.mjs Structural lint + `shopify theme check` if the CLI is installed.
themes/
  <slug>/         Source of truth = theme.config.json + overrides/. dist/ is generated.
```

### The restyle seam

`snippets/css-variables.liquid` maps theme settings → CSS custom properties, and
`assets/base.css` consumes only those vars. A **preset only edits `settings_data.json`**,
so changing colors/fonts/radii/spacing re-skins the entire theme without touching Liquid.
That's what makes one codebase yield many visually distinct themes.

## Workflow

```bash
npm run new -- coastal-mono "Coastal" minimal-mono   # scaffold a theme from a preset
npm run build -- coastal-mono                         # compose -> themes/coastal-mono/dist + .zip
npm run verify                                        # structural lint (+ theme check if CLI present)
npm run build:all                                     # rebuild every theme
npm test                                              # factory unit tests
```

### Preview & deploy (Shopify CLI)

`dev`/`push` rebuild the theme first, then hand off to the CLI against `dist/`:

```bash
npm run dev  -- coastal-mono --store=your-store.myshopify.com   # hot-reload preview at :9292
npm run push -- coastal-mono --unpublished                      # upload as an unpublished theme
```

Set the store once to drop the flag: `export SHOPIFY_FLAG_STORE=your-store.myshopify.com`
(add to `~/.zshrc`). The first `dev`/`push` opens your browser to authorize the store.
A free **Partner development store with sample data** is the best preview target — an empty
store shows placeholder tiles and no predictive-search results (expected, not a bug).

You can also upload `themes/<slug>/dist/` (or the `.zip`) manually via
**Online Store → Themes → Add theme → Upload zip**.

## Per-theme customization

- **Settings only** (most themes): set `preset` + `settings` overrides in `theme.config.json`.
- **Structural changes**: drop a `sections/*.liquid` or `templates/*.json` into the theme's
  `overrides/` folder — it overlays the shared core for that theme only during build.

## Tooling note — shopify.dev MCP

The [shopify.dev MCP server](https://shopify.dev/changelog/shopifydev-mcp-now-supports-more-apis)
now generates code for **Liquid**, Polaris web components, Storefront / Customer Account /
Partner / Payment Apps APIs. Add it to your editor to get Liquid-aware autocomplete and
`theme check`–style guidance while extending `section-kit`.

## Status

- [x] Shared core (layout, settings, CSS-var seam, locales)
- [x] Section library (header/footer + 11 content + 10 main sections)
  - content: hero, rich-text, featured-collection, image-with-text, multicolumn,
    newsletter, **faq, testimonials, logo-list, collection-list, countdown, slideshow**
- [x] Generator + compose/zip + structural verify + tests
- [x] 4 presets (Minimal Mono, Warm Boutique, Bold Pop, Noir Luxe)
- [x] `blog` / `article` / `password` / `gift_card` templates (+ password layout)
- [x] `customers/*` templates (login, account, register, addresses, order, activate, reset)
- [x] AJAX cart drawer + predictive search (vanilla JS, no framework)
- [x] 4 themes built (aurora-mono, bloom-boutique, lumen-noir, volt-pop) — one per preset
- [x] Passes real `shopify theme check` — **0 offenses** across all 4 themes
- [ ] More presets / section packs
- [ ] Localized cart/search section-rendering for multi-language polish
- [ ] Submit a flagship to the Theme Store

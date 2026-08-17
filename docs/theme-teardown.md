# Teardown: ~98 commercial Shopify themes → what the factory should take

Study of two download folders — `100+ Shopify Themes` (1.0 GB, partial) and
`100+ Shopify Themes 2` (2.0 GB, 91 archives). Partially overlapping;
~98 distinct commercial themes total, all ThemeForest / Theme Store products
dated 2018–2021.

Nothing was copied into this repo. These are licensed products and their code is
not reusable here — this is a market and pattern study only.

## Finding 1: not one of them is OS 2.0

Every archive was opened and its templates counted (nested theme zips extracted
and listed):

```
archives inspected            91  (+ ~7 unique to folder 1)
Shopify theme roots found     90
JSON templates found           0     ← across the entire corpus
Liquid templates found     ~1900
```

Zero. The whole library is pre-Online Store 2.0 — no JSON templates, no section
groups, no app blocks. **Do not use any of it as an architectural reference.**
Their layout/section/settings architecture is precisely what OS 2.0 replaced.

Two archives are not Shopify at all: `tote-bags-shoes.zip` (WordPress — Visual
Composer, revslider, `designthemes-woo-extension`) and `brittnry.zip` (a PHP
theme, `404.php` + FontAwesome). `Alivana` and `Apparelix-Sunglasses` extracted
to documentation and a `.fig` file with no theme source.

## Finding 2: there are two distinct quality tiers, and the gap is enormous

The second folder contains real Theme Store themes (Pipeline, Impulse, Icon)
alongside ThemeForest bulk. Measured side by side:

| Theme | tier | sections | per-section color settings | global settings | CSS | JS |
| --- | --- | --- | --- | --- | --- | --- |
| **Pipeline** | Store | 21 | **0** | **50** | 315 KB | 346 KB |
| **Icon** | Store | 19 | 19 | 78 | 135 KB | 82 KB |
| **Impulse 3.4** | Store | 41 | 24 | 119 | 588 KB | 586 KB |
| Bixbang | Forest | 91 | 271 | 257 | 2270 KB | 1427 KB |
| fastlane 3.76 | Forest | 61 | 270 | **1177** | 1631 KB | 1387 KB |
| Lezada 2.4.2 | Forest | 111 | **1116** | 277 | 3482 KB | 1477 KB |
| Theno | Forest | 58 | — | 323 | 1289 KB | 2323 KB |
| Acoffee | Forest | 48 | — | 681 | 1663 KB | 793 KB |
| **this factory** | — | **34** | 0 | **12** | **~4 KB** | **~7 KB** |

Pipeline ships a commercially successful theme with **21 sections, 50 settings,
and zero per-section colour pickers**. Lezada ships 111 sections and 1116 colour
pickers. Both sell. The difference is that one is maintainable.

Our section count (34) already sits in the Theme Store band (19–41). We do not
need more sections — we need deeper ones.

## What not to copy (three measured anti-patterns)

**1. Asset weight.** The Forest tier ships 0.75–2.3 MB of JS and 0.9–3.5 MB of
CSS, unminified, before images. Layout heads pull jQuery (1.12 / 2.2 / 3.5 —
sometimes two versions), Bootstrap, slick, owl.carousel, fancybox, isotope,
magnific-popup, jQuery UI, elevateZoom, Revolution Slider. Theno alone loads 20
libraries. Even the Store tier carries jQuery (Pipeline) or a `vendor.js`
(Impulse). All of them would fail today's performance budget.

Our vanilla core — `cart.js` 133 lines, `predictive-search.js` 62, `base.css`
109 — is two orders of magnitude lighter. That is a differentiator worth putting
on the sales page, not just an engineering preference.

**2. Variant-by-duplication.** The Forest tier ships visual variants as
*duplicated section files*: `home-product-style01`…`style22`,
`header-style01`…`09`, `footer-style01`…`09`, `slideshow-v1/v2/v3`. infinit's
125 sections are six sections copy-pasted. Every bug is then fixed 22 times.

Our preset + CSS-variable seam does this from one file. Keep it. Borrow only the
*insight* that buyers want many looks — deliver it via `settings_data.json`
presets and section `style` selects, never via file copies.

**3. Colour settings pushed into every section.** Lezada: 1116 per-section
colour settings. fastlane: 270. Merchants get a picker in every section and no
way to restyle globally. Pipeline's 0 proves it is unnecessary. Our
`css-variables.liquid` seam is right; add at most an optional per-section
background/text override that *defaults to the global var*.

## What to copy

### 1. Grow the global settings surface — and copy Pipeline/Impulse's taxonomy

12 settings is well below what a paying buyer expects. But the target is the
Store tier (50–119), **not** the Forest tier (257–1177). Their groups:

```
Pipeline (50)                    Impulse 3.4 (119)
  Color            16              Colors           29
  Typography        6              Typography       21
  Cart              7              Products         35
  Product grid      5              Collection grid   7
  Social           15              Cart              6
  Favicon           1              Social media     13
                                   Favicon           1
                                   Search            6
                                   Extras            1
```

Target **~60–90**. Concretely missing here: logo + logo width, favicon, social
account URLs (Pipeline spends 15 settings on this alone), cart type
(drawer/page/redirect), products-per-row, product-card content toggles, and
colour tokens beyond the current four (border, subtle background, sale/badge,
success/error).

### 2. Product-card merchandising is the biggest functional gap

Our `product-card.liquid` is 19 lines: image, title, price, sold-out badge.
Feature prevalence across the sampled themes:

```
wishlist                5/8      swatches                5/8
compare                 5/8      countdown / deal timer  5/8
currency switcher       5/8      quick view              4/8
mega menu               4/8      instagram feed          4/8
sticky add-to-cart      4/8      product tabs            4/8
trust / payment badges  4/8      infinite scroll         3/8
recently viewed         3/8      back-in-stock notify    3/8
predictive search       1/8   ← we already have it, they mostly don't
```

Best value-per-line, in order: **sale-% badge**, **second image on hover**,
**colour swatches from variant options**, **quick add** (the AJAX cart plumbing
already exists), **product tabs**, **sticky mobile add-to-cart**.
Wishlist/compare need app-level persistence — skip, or do localStorage-only and
say so plainly.

### 3. Two Liquid patterns worth reimplementing

**Time-windowed "New" badge** (Theno). A global `product_new_time` setting in
days; the card compares `product.published_at + days` against `'now'`. The
merchant sets one number and badges appear and expire automatically — no
tagging, no app, no metafield.

**Tag-driven badges.** `product.tags contains "hot"` / `"popular"` drives extra
badges. Zero-infrastructure merchandising the merchant already understands.
Worth a `badge_tags` setting listing which tags render.

Two bugs of theirs not to inherit: their sale badge reads
`product.variants.first.compare_at_price` while labelling the whole product — it
goes wrong on multi-variant products with mixed pricing (use
`compare_at_price_max`); and their countdown reads a single **theme-wide** date
for every product, which is cosmetic rather than a real per-product deal. Drive
any deal timer from a metafield or per-block date.

### 4. Schema localization — the one thing that beats all 98

Across the entire corpus, uses of `t:` translation keys in section schemas:

```
Pipeline 0 · Impulse 0 · Icon 0 · Lezada 0 · fastlane 0 · Bixbang 0   → 0 / 98
```

Not one theme localizes its schema. We currently don't either — our schemas
hardcode English (`"label": "Subheading"`, `"default": "Shop now"`). The
difference is that this is now a **blocking Theme Store requirement**: schema
strings must be `t:` keys resolved from `locales/*.schema.json`. Doing it is
both a review gate we must pass and a genuine point of differentiation against
every theme in this corpus.

Runtime localization is also behind: they average 86–986 uses of `| t` and
9–13 KB `en.default.json`; we have 115 uses and 4 KB.

## Recommended next moves

1. **Add `locales/en.default.schema.json`** and convert every section schema
   `label`/`info`/`option` string to a `t:` key. Blocking for Theme Store.
2. **Grow `settings_schema.json` to ~60–90** using the Pipeline/Impulse taxonomy
   above. Presets keep re-skinning for free.
3. **Rebuild `product-card.liquid`** with sale badge, hover image, swatches,
   quick add, and the time-windowed new badge — all behind settings toggles.
4. **Add section packs** for the 4+/8 features we lack: product tabs, sticky
   add-to-cart, trust-badge bar, mega menu.
5. **Do not** grow the section count much past 40, and **do not** add a
   jQuery/Bootstrap dependency for any of it. The weight table is the argument.

## Housekeeping on the download folders

- Folder 1 is a partial re-download of folder 2; folders overlap on Acoffee,
  Alivana, Amely, Apparelix-Sunglasses. Folder 1 uniquely holds ClickBoom,
  Jardin, Polka, Theno, beauty-store, infinit, tote-bags.
- `tote-bags-shoes.zip` and `brittnry.zip` are WordPress/PHP themes — misfiled.
- Each outer archive holds 3–22 near-identical "home" variants of one theme
  (infinit 22, beauty-store 15, Nautica 8, Theno 6). ~3 GB total is mostly
  duplicates, PSDs, and demo imagery — perhaps 90 distinct themes and far fewer
  distinct architectures.

<!-- stardust provenance: skill=stardust:dynamics · phase=plan draft · 2026-11-10T22:57:26.159Z · input stardust/current/_dynamics.json (4 pages, 45 findings) · target probe https://main--1a676f95--aemcoder.aem.page -->
# Dynamic features — draft inventory (curate into `stardust/dynamic-features.md`)

One row per detected finding. Merge duplicates, drop noise, keep every axis honest. Columns: disposition = what we do · target = the delivery form (widget where no authored rows remain) · reproducibility = what it needs · status = where it stands (reference/triage.md).

| # | id | class | feature | pages | disposition | target | reproducibility | status | pattern | decision needed | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a-unknown-third-party-host-cdn-segment-com | A | unknown third-party host cdn.segment.com | 4/4 | static-snapshot | — | needs-human-capture | pending | inspect | inspect the XHR, add a vendor row |  |
| 2 | a-unknown-third-party-host-collect-analyze-ly | A | unknown third-party host collect.analyze.ly | 4/4 | static-snapshot | — | needs-human-capture | pending | inspect | inspect the XHR, add a vendor row |  |
| 3 | a-unknown-third-party-host-fast-a-klaviyo-com | A | unknown third-party host fast.a.klaviyo.com | 4/4 | static-snapshot | — | needs-human-capture | pending | inspect | inspect the XHR, add a vendor row |  |
| 4 | a-unknown-third-party-host-static-forms-klaviyo-com | A | unknown third-party host static-forms.klaviyo.com | 4/4 | static-snapshot | — | needs-human-capture | pending | inspect | inspect the XHR, add a vendor row |  |
| 5 | a-unknown-third-party-host-www-google-com | A | unknown third-party host www.google.com | 4/4 | static-snapshot | — | needs-human-capture | pending | inspect | inspect the XHR, add a vendor row |  |
| 6 | a-unknown-third-party-host-a-klaviyo-com | A | unknown third-party host a.klaviyo.com | 4/4 | static-snapshot | — | needs-human-capture | pending | inspect | inspect the XHR, add a vendor row |  |
| 7 | a-first-party-api-post-api-collect | A | first-party API POST /api/collect | 4/4 (reach 120/120) | data-fed | block | needs-business-decision | pending | off-origin-data | which tier for the target host; consumer on the migrated pages? | **dead on target (404)** |
| 8 | a-first-party-api-post-api-unstable-graphql-json | A | first-party API POST /api/unstable/graphql.json | 4/4 (reach 120/120) | data-fed | block | needs-business-decision | pending | off-origin-data | which tier for the target host; consumer on the migrated pages? | **dead on target (404)** |
| 9 | a-cms-app-settings-object-shopify | A | CMS / app settings object Shopify | 4/4 | static-snapshot | content | self | pending | read-settings | — (keys name endpoints, ids, vendors) |  |
| 10 | a-cms-app-settings-object-datalayer | A | CMS / app settings object dataLayer | 4/4 | static-snapshot | content | self | pending | read-settings | — (keys name endpoints, ids, vendors) |  |
| 11 | a-unknown-third-party-host-api-segment-io | A | unknown third-party host api.segment.io | 2/4 | static-snapshot | — | needs-human-capture | pending | inspect | inspect the XHR, add a vendor row |  |
| 12 | a-first-party-api-post-well-known-shopify-fec-produce | A | first-party API POST /.well-known/shopify/fec/produce | 2/4 (reach 1/120) | data-fed | block | needs-business-decision | pending | off-origin-data | which tier for the target host; consumer on the migrated pages? | **dead on target (404)** |
| 13 | f-form-contactfooter-origin-contact-1-fields | F | form "ContactFooter" → origin /contact (1 fields) | 4/4 | rebuild-native | block | needs-backend | pending | forms | production endpoint; interim capture ships now |  |
| 14 | f-form-needsclick-no-action-js-wired-2-fields | F | form "needsclick" → no action (JS-wired) (2 fields) | 4/4 | rebuild-native | block | needs-backend | pending | forms | production endpoint; interim capture ships now |  |
| 15 | f-form-contactnewsletter-origin-contact-1-fields | F | form "ContactNewsletter" → origin /contact (1 fields) | 1/4 | rebuild-native | block | needs-backend | pending | forms | production endpoint; interim capture ships now |  |
| 16 | i18n-locale-variants-en-us | I18N | locale variants en-us | 4/4 | rebuild-native | runtime | needs-business-decision | pending | locale-tree | scope of the locale trees |  |
| 17 | l-listing-candidate-tabbed-products-slider-inner-23-cards | L | listing candidate tabbed-products__slider-inner (23 cards) | 1/4 | index-backed | block | needs-business-decision | pending | listing-index-backed | index-driven or editorially curated? |  |
| 18 | l-listing-candidate-content-products-quotes-8-cards | L | listing candidate content-products__quotes  (8 cards) | 1/4 | index-backed | block | needs-business-decision | pending | listing-index-backed | index-driven or editorially curated? |  |
| 19 | l-listing-candidate-container-tight-4-cards | L | listing candidate container__tight (4 cards) | 1/4 | index-backed | block | needs-business-decision | pending | listing-index-backed | index-driven or editorially curated? |  |
| 20 | l-listing-candidate-blog-listing-article-item-grid-9-cards | L | listing candidate blog__listing article-item__grid (9 cards) | 1/4 | index-backed | block | needs-business-decision | pending | listing-index-backed | index-driven or editorially curated? |  |
| 21 | l-listing-candidate-article-item-grid-3-cards | L | listing candidate article-item__grid (3 cards) | 1/4 | index-backed | block | needs-business-decision | pending | listing-index-backed | index-driven or editorially curated? |  |
| 22 | m-modal-trigger-aria-haspopup-chrome-only-button-content | M | modal trigger aria-haspopup (chrome only) → button:content | 4/4 (reach 25/120) | rebuild-native | runtime | self | pending | chrome-interaction | none (the header contract is the spec) |  |
| 23 | s-site-search-form-search | S | site search form → /search | 4/4 (reach 120/120) | index-backed | widget | self | pending | search-index-backed | none (corpus = the migrated pages; second corpora stay out) |  |
| 24 | t-consent-onetrust | T | consent: OneTrust | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | CMP domain script reuse on the new host |  |
| 25 | t-unknown-third-party-host-static-klaviyo-com | T | unknown third-party host static.klaviyo.com | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 26 | t-tag-manager-google-tag-manager | T | tag manager: Google Tag Manager | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 27 | t-unknown-third-party-host-shop-app | T | unknown third-party host shop.app | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 28 | t-unknown-third-party-host-static-tracking-klaviyo-com | T | unknown third-party host static-tracking.klaviyo.com | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 29 | t-unknown-third-party-host-d22xmn10vbouk4-cloudfront-net | T | unknown third-party host d22xmn10vbouk4.cloudfront.net | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 30 | t-analytics-google-analytics-ads | T | analytics: Google Analytics / Ads | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 31 | t-marketing-ad-retargeting-pixel | T | marketing: ad / retargeting pixel | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 32 | t-unknown-third-party-host-s-pinimg-com | T | unknown third-party host s.pinimg.com | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 33 | t-unknown-third-party-host-cdn-gbqofs-com | T | unknown third-party host cdn.gbqofs.com | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 34 | t-unknown-third-party-host-adservice-google-com | T | unknown third-party host adservice.google.com | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 35 | t-unknown-third-party-host-www-facebook-com | T | unknown third-party host www.facebook.com | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 36 | t-unknown-third-party-host-d3k81ch9hvuctc-cloudfront-net | T | unknown third-party host d3k81ch9hvuctc.cloudfront.net | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 37 | t-feedback-survey-voc-badge | T | feedback: survey / VoC badge | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 38 | t-unknown-third-party-host-simage2-pubmatic-com | T | unknown third-party host simage2.pubmatic.com | 4/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 39 | t-unknown-third-party-host-dsum-sec-casalemedia-com | T | unknown third-party host dsum-sec.casalemedia.com | 3/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 40 | t-social-proof-reviews-widget | T | social proof: reviews widget | 2/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 41 | t-third-party-mount-div-data-bv-show-tag-manager-injected-wi | T | third-party mount <div data-bv-show> (tag-manager-injected widget) | 2/4 | embed-passthrough | embed | needs-credential | pending | embed-passthrough | vendor account ids stay the owner's |  |
| 42 | t-unknown-third-party-host-x-bidswitch-net | T | unknown third-party host x.bidswitch.net | 2/4 | embed-passthrough | embed | needs-business-decision | pending | consent-gated-tags | which tags run on the new host; property ids |  |
| 43 | v-iframe-without-src-runtime-injected-embed | V | iframe without src (runtime-injected embed) | 4/4 | embed-passthrough | embed | needs-human-capture | pending | embed-passthrough | resolve the runtime src from a rendered capture |  |
| 44 | x-commerce-platform | X | commerce: platform | 4/4 | decided-out | — | needs-backend | pending | decided-out | auth / commerce on the new host? |  |
| 45 | x-commerce-signals-cart-true-prices-2 | X | commerce signals (cart: true, prices: 2) | 4/4 | decided-out | — | needs-backend | pending | decided-out | auth / commerce on the new host? |  |

## Triage

- **Ships autonomously (reproducibility `self`):** 4 row(s) — read-settings, chrome-interaction, search-index-backed.
- **One owner decision batch:** 39 row(s) — inspect the XHR, add a vendor row · which tier for the target host; consumer on the migrated pages? · production endpoint; interim capture ships now · scope of the locale trees · index-driven or editorially curated? · CMP domain script reuse on the new host.
- **Already delivered by the capture pipeline:** 0 row(s) — no work.
- **Host-bound on the target:** 3 of 3 probed API paths — the off-origin data work.

## Phases

- **tags** — 18
- **detect** — 9
- **listings** — 5
- **off-origin data** — 3
- **forms** — 3
- **embeds** — 2
- **register** — 2
- **locale wave** — 1
- **interactive** — 1
- **search** — 1

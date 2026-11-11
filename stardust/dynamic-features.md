# Dynamic features — naturesbounty.com

Drafted by dynamics-detect/-plan (45 rows: stardust/dynamics/dynamic-features.generated-plan.json), curated
here into families. Hands-off: every non-self row ships its interim tier as a named assumption of this run.

## Listings contract

- `/blogs/news` and `/blogs/recipes` card grids, the article "More to explore from <category>" row and the
  recipe "More recipes" row: shipped as authored cards (static snapshot of the captured listing, verbatim,
  in captured order). Pages emit `title`, `description`, `image`, `category` (articles) metadata so an index-backed
  listing can replace the snapshot later. Interim: static-snapshot; unfreeze when a query index is added.
- Home "Shop Our Most Loved Products" tabbed product carousel and testimonials: static snapshot of the captured
  products (products are not in this run's scope; product links point to the source origin).

## Features

| # | id | feature | class | reach | disposition | target | reproducibility | status | decision / owner |
|---|---|---|---|---|---|---|---|---|---|
| 1 | m-header-menus | header mega-menus (Products / Health Benefits / Learn), mobile drill-down drawer | M | all | rebuild-native | runtime (header block) | self | planned | — |
| 2 | s-site-search | header search form → /search | S | all | index-backed | widget | self | planned | search widget + /search results page over the migrated corpus (query index); never the source results URL |
| 3 | carousels | home hero video/slides, product tabs slider, "It's in your nature" slider, testimonials (Swiper) | M | home | rebuild-native | block JS | self | planned | — |
| 4 | f-newsletter | Klaviyo newsletter forms (footer "ContactFooter", "ContactNewsletter", modal) | F | all | embed-passthrough | embed | needs-backend | interim | UI rebuilt; submission posts to the source /contact endpoint is host-bound → interim: form rendered, submit opens source sign-up — assumption A2 |
| 5 | klaviyo-modal | timed "Sign up and save $2" Klaviyo modal | T | all | embed-passthrough | embed | needs-business-decision | scaffolded-awaiting-owner | marketing tag on the new host is the owner's call — assumption A3 (not loaded) |
| 6 | t-consent-onetrust | OneTrust consent | T | all | embed-passthrough | embed | needs-business-decision | scaffolded-awaiting-owner | A3 |
| 7 | tags | GTM, GA/Ads, Segment, analyze.ly, Facebook, Pinterest, PubMatic, Casale, Bidswitch, gbqofs, CloudFront-hosted tag scripts, shop.app, survey/VoC badge | T/A | all | embed-passthrough | embed | needs-business-decision | scaffolded-awaiting-owner | A3 — martech not requested; scaffolded off |
| 8 | reviews | Bazaarvoice reviews widget (`data-bv-show`) | T | 2 | embed-passthrough | embed | needs-credential | interim | captured star ratings shipped as static snapshot — assumption A4 |
| 9 | first-party-api | POST /api/collect, POST /api/event/collect, /api/unstable/graphql.json, /.well-known/shopify/fec | A | all | static-snapshot | content | needs-business-decision | interim | Shopify storefront analytics / cart — host-bound (3/3 dead on target); not needed by blog pages |
| 10 | settings-objects | `Shopify`, `dataLayer` globals | A | all | static-snapshot | content | self | done | no consumer on migrated pages |
| 11 | iframe-runtime | runtime-injected iframes (tag/consent frames) | V | all | static-snapshot | content | self | done | belong to the tags in row 7 |
| 12 | i18n | single locale en-us | I18N | all | rebuild-native | — | self | done | no locale variants |
| 13 | commerce | Shopify cart / prices | X | 4 | static-snapshot | content | needs-backend | interim | product cards link to source product pages; prices/cart not rendered on blog pages. Undecided — revisit at rollout (assumption A5) |
| 14 | listing-pagination | `/blogs/news` + `/blogs/recipes` "Load More" (live fetches `?page=N` in place) | L | 2 | rebuild-native | block (listing-pagination) | self | planned | delivered pages carry the captured first page; Load More links to the next listing page; index-backed append when a query index exists |

## Decision batch

One message for the site owner (recorded, interim tiers shipped meanwhile):
- **A1 search** — on-site search covers the migrated articles and recipes only (product search stays on the store).
- **A2 newsletter** — which Klaviyo list/endpoint the new host's forms post to.
- **A3 tags & consent** — which marketing/analytics tags and the OneTrust CMP load on the new host.
- **A4 reviews** — Bazaarvoice credentials for live ratings, or keep the captured snapshot.
- **A5 commerce** — product pages stay on the source store; links point there.

## Register (decided-out)

| feature | reason | production statement |
|---|---|---|
| — | none decided-out (hands-off assumptions never decide out) | — |

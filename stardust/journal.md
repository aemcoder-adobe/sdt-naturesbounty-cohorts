# Journal — naturesbounty.com replica

## Extract — 120 of 121 planned pages captured live (2026-11-10)

- Ran `crawl.mjs --pages <121 planned URLs> --dynamics --concurrency 3` (extract --prep scope fixed by
  site-plan; no discovery beyond it). 120/120 HTML pages live (Playwright provenance on every record);
  `/agents.md` is text/markdown (ContentTypeError) — a non-page.
- Types (catalog extended with `recipe` for the recipe template): landing 1 (home), listing 2
  (/blogs/news, /blogs/recipes), article 77, recipe 40.
- Vision check (subagent, thumbnails): every page rendered; 42 screenshots carry the OneTrust banner and/or the
  Klaviyo "Sign up and save $2" modal (consent auto-dismiss missed them) — records come from the DOM; every live
  instrument from here passes `--dismiss "#onetrust-accept-btn-handler,.klaviyo-close-form"`.
  `blogs-news-easy-hairstyles` shows blank embed gaps.
- Style census on a 13-page stratified sample (1440 + 360). Sofia Pro (Adobe Fonts kit) everywhere — licensed,
  will need a metric-matched substitute. Palette forest #27463a / lime #d2e38f.
- cap-probe: home fluid; listing/article/recipe cap content at 1680px.
- Header contract recorded with chrome-explore (1440, 360).
- Wrote current PRODUCT.md, DESIGN.md, DESIGN.json (10 module candidates), _brand-extraction.json, brand-review.html.
  Typed slots per page not authored (the replica path reads the captured records directly).
- Header contract: `chrome-explore.mjs` crashed on this site three times (route double-handle once, then
  "Cannot destructure property 'c' of 'trail[i]'" twice, at default and at reduced depth). Recorded as an
  instrument residual; the header behaviour is taken from motion-observe + the captured header DOM
  (Products / Health Benefits / Learn mega-menus, search, mobile drill-down drawer) and re-tried at C0.

## Preserve direction — spec promoted verbatim, register 1 entry, dynamics triaged (2026-11-10)

- current/PRODUCT.md, DESIGN.md, DESIGN.json promoted byte-for-byte to the project root; stardust/direction.md
  records preserve mode.
- Inconsistency register: R-01 only (licensed Sofia Pro kit → metric-matched substitute, brand family first).
  Pure replica otherwise; cap-probe's divergent caps (home fluid vs 1680 content cap) are kept as captured.
- Dynamics: 45 detected rows curated into 13 families in stardust/dynamic-features.md; self rows: header menus,
  carousels, search (index-backed over the migrated corpus); interim/named assumptions A1–A5 for newsletter,
  tags/consent, reviews, commerce. Nothing decided-out.

## Recreate — article archetype gated (2026-11-10)

- the-benefits-of-biotin: 1440 pixel 2.23 %, Δh 0, content-diff 0 red; 360 pixel 16.66 %, Δh −45 px after 3
  iterations — residual attributed to R-01 (Figtree substitute for licensed Sofia Pro wraps differently at 360).
  cap-probe PASS. Motion: ticker, click mega-menus, search expand, mobile drawer, footer accordions built.
- Approved hands-off with the 360 residual logged under R-01 (font substitution is the register's only delta).
- Canon layer: stardust/prototypes/canon.css, canon.js, article.css; Figtree self-hosted.

## Recreate — listing archetype gated (2026-11-10)

- blogs-news: 1440 2.04 % Δh 0; 360 3.62 % Δh 1; content-diff 0 red; cap-probe PASS; motion 5 matched. Approved hands-off.
- Sibling variance: /blogs/recipes has a page-hero image banner (h1 "Recipes"), no featured block, and a
  3-card cross-blog "blog-list" section — both modules to be added at its sibling render (listing.css lacks them).
- Load More: live fetches page 2 in place; prototype links ?page=2 — dynamics row to add (listing pagination).

## Recreate — recipe archetype gated (2026-11-10)

- apple-crisp: template control (live's current "More recipes" cards) 1440 1.79 % Δh 0, 360 4.08 % Δh 1, content-diff 0.
  Shipped prototype keeps the captured card set (live rotates server-side): 1440 6.68 %, 360 32 % / Δh 129 — a
  permanent nondeterministic-content residual, not a template defect. cap-probe PASS. Approved hands-off.
- R-02 registered: recipe header "Where to Buy" text vs pill elsewhere → pill everywhere.
- Canon: global `sup` rule added (live theme).

## Recreate — landing archetype gated, recreate phase closed (2026-11-11)

- index (home): 1440 2.70 % Δh −1, content-diff 0 red / 0 nothing-lost, clipped 0; 360 8.55 % Δh −33 after 3
  iterations — the height residual is one R-01 wrap (Digestive Probiotic 10 card text 7 lines live, 6 with Figtree),
  every other box height-matched. cap-probe PASS at 2560 (0/8). Motion 8 matched; hero video autoplay and first-slide
  entrance logged as captureState restoreAtDelivery. Approved hands-off with the 360 residual under R-01.
- New: landing.css, landing.js, gen-landing.cjs; stardust/replica/accepted.json (Swiper loop clones, text-scoped);
  units.json +5 families. Canon unchanged. Live hero h1 computes `null, sans-serif` — replicated as captured.
- All four archetypes (article, listing, recipe, landing) gated and approved; next is handoff (migrate → deploy → rollout).

## Plan — migrate plan: 4 archetypes, 116 siblings in 16 render clusters (2026-11-11)

- Path A 4 (index, blogs-news, the-benefits-of-biotin, apple-crisp); Path A′ 116 (listing 1, article 76, recipe 39);
  Path B 0. Gated-archetype precondition holds (360 residuals all carry an R-01 cause). Siblings advanced to `directed`.
- Units in stardust/migrate/progress.json: render clusters of ≤ 8 (listing, recipe-1…5, article-1…10), each runs only
  after its template's C-archetype unit is done. Publish decision recorded in stardust/eds-conversion-log.md.

## A-inventory — 120 pages in coverage, 4 archetypes to deliver first (2026-11-11)

- Archetypes rendered Path A by migrate.mjs (modules[] declared per archetype); inventory --state merged 116 siblings as
  content-pending. 1 of 121 discovered out of scope (agents.md, text/markdown). DA aemcoder/1a676f95 ref main.

## B-block — 21 distinct blocks, each converted once (2026-11-11)

- blocks.json: 21 module blocks from 30 instances (social-strip, trusted-band ×4; product-rail, related, share ×2).
  plan.json representative-first: biotin → article set, apple-crisp → recipe, blogs-news → listing, index → home modules.

## B2-dynamic — dynamic surface re-verified on the 4 archetypes (2026-11-11)

- Fresh detect (stardust/.work/dynamics/fresh): 46 findings vs 45 at extract; the one new row (POST /api/event/collect,
  Shopify analytics beacon, host-bound) folded into family 9. Added row 14 listing pagination (Load More). All 14
  families dispositioned; nothing blocks C-deliver.

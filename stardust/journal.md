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

# Inconsistency register — naturesbounty.com

The ONLY permitted design deltas of this replica run. No audit was requested and no user items were
supplied; the one entry below is a licensing constraint, not a design improvement.

## R-01 — Licensed Sofia Pro kit cannot be served from the new domain

- **Evidence:** every measured node renders `sofia-pro` (stardust/current/_computed-styles.json
  aggregate.type.families: 1472 nodes), loaded from the Adobe Fonts kit `use.typekit.net/vrc7vwb.css`,
  which is licensed to the source domain.
- **Finding:** the brand face is a commercial kit; rehosting it is not permitted and the kit is
  domain-restricted.
- **Minimal change:** font stack `sofia-pro, <metric-matched open substitute>, sans-serif` — the brand
  family stays first so a licensed drop-in (adding the new domain to the kit) wins with no code change.
  Expected delta: glyph-shape and small advance-width differences in text runs only.
- **Status:** applied
- **Where:** all page types, all text.
- **Substitute chosen (2026-11-10, article archetype):** Figtree (OFL, self-hosted variable latin woff2 at
  `stardust/current/assets/fonts/figtree-latin-var.woff2`), stack `"sofia-pro", "Figtree", sans-serif`.
  Picked by canvas string-width measurement against the live kit across 15 open candidates: −0.13 % (400),
  +0.10 % (500), +1.25 % (700) on mixed strings; page text body −1.13 %, uppercase tags +4.58 %.
  Known consequence: line-break differences (most visible at 360 px) — see progress.json types.article.residuals.

## R-02 — "Where to Buy" header CTA styled differently on recipe pages

- **Evidence:** header crop diff 8.08 % at 1440 on /blogs/recipes/apple-crisp: plain black text there, lime pill on
  articles, listings and home (stardust/replica/gates/apple-crisp-1440/).
- **Finding:** the same global header CTA renders in two styles depending on the template — an internal inconsistency
  of one shared chrome element.
- **Minimal change:** render the lime pill (the majority style) on every template; no other header change.
- **Status:** applied
- **Where:** recipe pages, header only.

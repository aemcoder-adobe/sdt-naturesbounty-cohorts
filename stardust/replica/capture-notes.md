# Capture notes (live naturesbounty.com)

- Overlays on every page: OneTrust consent banner (`#onetrust-accept-btn-handler`) and a timed Klaviyo
  "Sign up and save $2" modal (`.klaviyo-close-form`). Every live instrument passes
  `--dismiss "#onetrust-accept-btn-handler,.klaviyo-close-form"` (gate: `--consent` / `--dismiss`).
- `/agents.md` is served as text/markdown (ContentTypeError) — not an HTML page; recorded as a non-page in scope.
- Style census measured a 13-page type-stratified sample (home, both listings, every 13th article, every 10th recipe) at 1440 and 360 rather than all 120: the article/recipe pages share one Shopify theme; URLs in stardust/.work/census-urls.txt.

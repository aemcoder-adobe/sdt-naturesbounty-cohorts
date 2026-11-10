<!-- stardust:provenance
writtenBy: stardust:extract
mode: prep (descriptive)
writtenAt: 2026-11-10T22:30:00Z
sources: stardust/current/pages/*.json (120 live Playwright renders), stardust/current/_crawl-log.json
-->
# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

_provenance: inferred — from the captured copy (health-needs navigation, wellness articles, recipes)._
Adults shopping for vitamins and supplements by health need (women's wellness, men's health, brain,
bone & joint, digestive, immune, sleep, hair/skin/nails), and readers looking for wellness tips and
healthy recipes.

## Product Purpose

The site is the brand home of Nature's Bounty (vitamins, supplements, gummies). It presents the product
range by category and health need, promotes best sellers, and publishes two content streams — wellness
articles (`/blogs/news`) and healthy recipes (`/blogs/recipes`) — that link back to products.
Meta description (home): "Explore Nature's Bounty® for high-quality vitamins, supplements, and wellness
products…".

## Positioning

"50 Years of Trusted Quality" / "Over 40 Years of Trusted Quality" (both strings appear in the capture);
campaign line "It's In Your Nature" ("Because you are bountiful. It's in your nature.").

## Capabilities and Constraints

- Shopify storefront (blog/article URL shape `/blogs/<blog>/<handle>`); product cards with ratings and
  "View Product" CTAs; "Where to Buy" header CTA.
- Site search form in the header on every page; Klaviyo newsletter sign-up (footer form + timed
  "Sign up and save $2" modal); OneTrust cookie consent.
- Article pages carry a share bar (Facebook, X, Pinterest, Email), a health-category sidebar
  and a "Looking for better health? Try these products" product rail; recipes carry
  Ingredients / Directions and a "More recipes" row.
- `/agents.md` is served as text/markdown, not a web page.

## Brand Commitments

- Register: `brand` (consumer marketing/content site).
- Name: Nature's Bounty® (registered mark rendered with ®); voice warm, encouraging, wellness-first,
  second person ("you"), with FDA asterisk disclaimers on structure/function claims.
- Logo: wordmark "NATURE'S BOUNTY." (header and footer).
- Anti-references observed: none stated.

## Evidence on Hand

- `stardust/current/pages/<slug>.json` + `.html` — 120 pages (home, 2 blog indexes, 77 articles, 40 recipes).
- `stardust/current/assets/screenshots/` — full-page captures at 1440.
- `stardust/current/_computed-styles.json` — computed-style census at 1440 and 360.
- Testimonials ("What our customers say") and product ratings appear on the home page; do not fabricate others.

## Product Principles

_provenance: inferred — from the captured structure._
1. Lead by health need, not by product SKU.
2. Content (articles, recipes) always routes back to relevant products.
3. Trust signals (years of quality, disclaimers, ratings) stay visible.

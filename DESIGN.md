---
name: Nature's Bounty (current state)
description: Vitamins & supplements brand site — deep forest green, lime accent, Sofia Pro throughout.
colors:
  forest: "#27463a"
  ink: "#000000"
  white: "#ffffff"
  rule: "#e5e5e5"
  lime: "#d2e38f"
  grey: "#777777"
  green: "#34773f"
  sage: "#5a7d54"
  mint: "#b5d7a8"
  moss: "#7fa76e"
  cream: "#f8f2eb"
  lime-pale: "#e2f2bf"
  olive: "#67893c"
typography:
  h1:
    fontFamily: "sofia-pro, sans-serif"
    fontSize: "50px"
    fontWeight: 800
  h2:
    fontFamily: "sofia-pro, sans-serif"
    fontSize: "25px"
    fontWeight: 700
  h3:
    fontFamily: "sofia-pro, sans-serif"
    fontSize: "44.44px"
    fontWeight: 500
  h4:
    fontFamily: "sofia-pro, sans-serif"
    fontSize: "22px"
    fontWeight: 800
  body:
    fontFamily: "sofia-pro, sans-serif"
    fontWeight: 500
rounded:
  sm: "5px"
  pill: "50px"
  circle: "50%"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
---
<!-- stardust:provenance
writtenBy: stardust:extract
mode: prep (descriptive)
sources: stardust/current/_computed-styles.json (13-page census, 1440 + 360), stardust/current/pages/*.json
-->

## Overview

Descriptive snapshot of naturesbounty.com (Shopify theme). A white page with a deep forest-green
(`#27463a`) chrome — header text, footer field, "Years of Trusted Quality" band — and a pale lime
(`#d2e38f`) pill as the primary button. One family, Sofia Pro (Adobe Fonts kit), carries every role.

## Colors

- `forest #27463a` — largest painted area (footer, bands, header text); background role.
- `lime #d2e38f` — primary buttons ("Where to Buy", "View Product", "Sign Up").
- `ink #000000` / `white #ffffff` — body text and page surface.
- `rule #e5e5e5` — borders and card outlines.
- Greens `#34773f`, `#5a7d54`, `#b5d7a8`, `#7fa76e`, `#67893c` — category labels, sidebar links, bands.
- Share-button brand colours: LinkedIn `#0077b5`, Facebook `#3b5998`, Twitter `#55acee`, Pinterest `#bd081c`.
- `cream #f8f2eb` — soft panels.

## Typography

Sofia Pro everywhere (census: 1472 measured nodes). Weight 700 dominates buttons and headings,
500 body, 800 large display. Sizes are ad-hoc (64, 50, 44.44, 36, 35.56, 25, 22 px …), not a modular scale.
Licensed commercial kit (`use.typekit.net/vrc7vwb.css`) — not rehostable.

## Layout

Centered content column inside a full-bleed page; articles use a main column plus a right sidebar
(category list, product rail). See `extensions.breakpoints` in DESIGN.json for the measured cap model.

## Elevation & Depth

One recurring shadow: `rgba(0,0,0,0.1) 5px 4px 20px 5px` (product cards).

## Shapes

Pill buttons (50px radius), 5px area radius on cards/panels, circles for carousel arrows.

## Components

Header (logo, Products / Health Benefits / Learn mega-menus, About Us, search, "Where to Buy"),
footer (link columns, newsletter, social, legal), social image strip, trusted-quality band,
related-card row, product rail, share bar, blog card grid, home product carousel.

## Do's and Don'ts

- Do keep the single-family typography and the lime pill CTA.
- Don't introduce new colours; the palette above is the captured set.

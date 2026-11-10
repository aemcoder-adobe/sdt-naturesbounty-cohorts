#!/bin/bash
# pre-gate self check: stitch proto at both widths and pixel-compare against the gate's cached live captures
cd /workspace/1a676f95
S=stardust/scripts/replica; W=stardust/replica/work; P=http://localhost:8791/the-benefits-of-biotin-proposed.html
for w in 1440 360; do
  node $S/stitch-shot.mjs "$P" $W/proto-$w.png --width $w >/dev/null 2>&1
  node $S/pixel-compare.mjs stardust/replica/gates/the-benefits-of-biotin-$w/live.png $W/proto-$w.png --out $W/diff-$w.png --threshold 10 2>&1 | grep -v '^\s*$' | grep -v 'diff image'
done

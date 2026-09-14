#!/usr/bin/env bash
# Slice a reference board PNG into its individual template cards.
#
#   ./scripts/slice-board.sh <board.png> <rows> <cols> <outdir> [prefix]
#
# Each cell is cropped on a uniform grid, then pure-black gutters are trimmed
# away. Dark cards that would over-trim fall back to the un-trimmed cell.
# Requires ImageMagick (convert/identify).

set -euo pipefail

SRC="${1:?usage: slice-board.sh <board.png> <rows> <cols> <outdir> [prefix]}"
ROWS="${2:?rows}"
COLS="${3:?cols}"
OUT="${4:?outdir}"
PREFIX="${5:-board}"

command -v identify >/dev/null || { echo "needs ImageMagick (identify)"; exit 1; }
command -v convert  >/dev/null || { echo "needs ImageMagick (convert)"; exit 1; }

read -r W H < <(identify -format "%w %h" "$SRC")
CW=$(( W / COLS ))
CH=$(( H / ROWS ))
mkdir -p "$OUT"

n=0
for (( r=0; r<ROWS; r++ )); do
  for (( c=0; c<COLS; c++ )); do
    n=$(( n + 1 ))
    X=$(( c * CW ))
    Y=$(( r * CH ))
    idx=$(printf "%02d" "$n")
    cell="$OUT/.cell-$idx.png"
    final="$OUT/$PREFIX-$idx.jpg"
    convert "$SRC" -crop "${CW}x${CH}+${X}+${Y}" +repage "$cell"
    # trim black gutters; keep only if the result is a sane size
    convert "$cell" -fuzz 8% -trim +repage "$OUT/.trim-$idx.png" || true
    TW=$(identify -format "%w" "$OUT/.trim-$idx.png" 2>/dev/null || echo 0)
    TH=$(identify -format "%h" "$OUT/.trim-$idx.png" 2>/dev/null || echo 0)
    if [ "$TW" -gt $(( CW * 60 / 100 )) ] && [ "$TH" -gt $(( CH * 60 / 100 )) ]; then
      convert "$OUT/.trim-$idx.png" -quality 90 "$final"
    else
      convert "$cell" -quality 90 "$final"
    fi
    rm -f "$cell" "$OUT/.trim-$idx.png"
    echo "$final"
  done
done
echo "sliced $n cards from ${W}x${H} into $OUT"

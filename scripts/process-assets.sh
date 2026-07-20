#!/usr/bin/env bash
# Turns relay-fetched source media (srcassets/) into optimized site assets.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p assets/img assets/video/frames assets/video/frames-m

if [ -f srcassets/hero-still-A.png ]; then
  ffmpeg -y -loglevel error -i srcassets/hero-still-A.png -vf "scale=1920:-2" -quality 82 assets/img/hero-still.webp
fi
if [ -f srcassets/memorial.png ]; then
  ffmpeg -y -loglevel error -i srcassets/memorial.png -vf "scale=1600:-2" -quality 78 assets/img/memorial.webp
fi
if [ -f srcassets/dawn.png ]; then
  ffmpeg -y -loglevel error -i srcassets/dawn.png -vf "scale=1600:-2" -quality 78 assets/img/dawn.webp
fi

if [ -f srcassets/hero-film.mp4 ]; then
  rm -f assets/video/frames/*.webp assets/video/frames-m/*.webp
  ffmpeg -y -loglevel error -i srcassets/hero-film.mp4 -vf "fps=19,scale=1600:-2" -c:v libwebp -quality 72 -f image2 assets/video/frames/f_%04d.webp
  ffmpeg -y -loglevel error -i srcassets/hero-film.mp4 -vf "fps=10,scale=960:-2" -c:v libwebp -quality 68 -f image2 assets/video/frames-m/f_%04d.webp
  C=$(ls assets/video/frames/f_*.webp | wc -l | tr -d ' ')
  M=$(ls assets/video/frames-m/f_*.webp | wc -l | tr -d ' ')
  cat > assets/video/frames.json <<JSON
{"count":$C,"base":"assets/video/frames/f_","ext":".webp","pad":4,
 "mobile":{"count":$M,"base":"assets/video/frames-m/f_"}}
JSON
  echo "frames: $C desktop, $M mobile"
  du -sh assets/video
fi
echo "done"

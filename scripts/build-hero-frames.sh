#!/bin/bash
# Prepara tus fotogramas para la animación del inicio: copia optimizada (JPEG, 1280 px de ancho) de cada
# imagen de public/assets/hero-originales en public/assets/hero-frames, con el mismo nombre.
# Uso: npm run hero-frames   (después, pon los nombres en src/app/core/data/hero.data.ts)
# Funciona con ImageMagick (Linux, Windows, Mac) o con sips (incluido en macOS).
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="public/assets/hero-originales"
OUT="public/assets/hero-frames"

if [ ! -d "$SRC" ]; then
  echo "No existe $SRC: crea esa carpeta y pon dentro tus fotogramas (PNG, JPG o WebP)."
  exit 1
fi

if command -v magick >/dev/null 2>&1; then
  resize() { magick "$1" -resize '1280x1280>' -quality 72 "$2"; }
elif command -v sips >/dev/null 2>&1; then
  resize() { sips -Z 1280 -s format jpeg -s formatOptions 72 "$1" --out "$2" >/dev/null; }
else
  echo "Necesitas ImageMagick (https://imagemagick.org) o macOS para convertir las imágenes."
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

count=0
for path in "$SRC"/*; do
  case "$path" in
    *.[pP][nN][gG]|*.[jJ][pP][gG]|*.[jJ][pP][eE][gG]|*.[wW][eE][bB][pP]) ;;
    *) continue ;;
  esac
  name="$(basename "${path%.*}")"
  resize "$path" "$OUT/$name.jpg"
  count=$((count + 1))
done

echo "$count fotogramas generados en $OUT"

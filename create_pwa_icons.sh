#!/bin/bash
# Erstellt PWA-Icons aus favicon.ico mit ImageMagick
# Voraussetzung: ImageMagick installiert (convert-Befehl)

set -e

ICON_SRC="technical/icons/icon.png"
ICON_DIR="technical/icons"

mkdir -p "$ICON_DIR"

# Erzeuge verschiedene PWA-Icon-Größen
for size in 72 144 192 256 384 512; do
	magick convert "$ICON_SRC" -resize ${size}x${size} -background transparent -gravity center -extent "${size}x${size}" "$ICON_DIR/icon-${size}.png"

done

echo "Icons wurden erstellt:"
for size in 72 144 192 256 384 512; do
	echo "$ICON_DIR/icon-${size}.png"
done

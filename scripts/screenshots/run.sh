#!/usr/bin/env bash
# README ekran görüntülerini yeniden üretir → assets/screenshots/
#
# Nasıl çalışır: uygulama geçici bir klasöre kopyalanır, yerel modüller (reklam, Firebase, Google
# girişi, tarih seçici, bildirimler) web için sahteleriyle değiştirilip Expo web derlemesi alınır;
# Playwright bu derlemeyi telefon boyutunda açıp seed.js'teki örnek veriyle ekranları çeker.
# Proje dosyalarına ve package.json'a dokunmaz.
#
# Kullanım:  bash scripts/screenshots/run.sh            (hepsi)
#            bash scripts/screenshots/run.sh tracking   (adı eşleşenler)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/scripts/screenshots"
TMP="$(mktemp -d)"
PORT=8765
trap 'kill "${SERVER_PID:-}" 2>/dev/null || true; rm -rf "$TMP"' EXIT

echo "› Geçici web projesi: $TMP"
mkdir -p "$TMP/app" "$TMP/tool"
cp -r "$ROOT/App.js" "$ROOT/index.js" "$ROOT/app.config.js" "$ROOT/package.json" "$ROOT/src" "$ROOT/assets" "$TMP/app/"
cp -r "$HERE/stubs" "$HERE/metro.config.js" "$TMP/app/"
ln -s "$ROOT/node_modules" "$TMP/app/node_modules"

# Yalnızca web çekimi için: sahte durum çubuğuna yer aç, web'de genişliği sıfırlanan etiketi düzelt
sed -i "s/^const STATUS_BAR_HEIGHT = .*/const STATUS_BAR_HEIGHT = 47;/" \
  "$TMP/app/src/components/SideDrawer.js" "$TMP/app/src/components/CustomThemesModal.js"
sed -i "s/marginLeft: 6, flex: 0 }/marginLeft: 6, flexShrink: 1 }/" "$TMP/app/src/components/StatsModal.js"

echo "› Web derlemesi alınıyor…"
(cd "$TMP/app" && npx expo export --platform web --output-dir dist >/dev/null)

echo "› Playwright hazırlanıyor…"
cp "$HERE/seed.js" "$HERE/shoot.js" "$TMP/tool/"
(cd "$TMP/tool" && npm init -y >/dev/null && npm install --silent playwright-core@1.57.0 && npx playwright-core install chromium >/dev/null)

(cd "$TMP/app/dist" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1) &
SERVER_PID=$!
sleep 2

echo "› Ekranlar çekiliyor…"
SHOTS_OUT="$ROOT/assets/screenshots" SHOTS_URL="http://127.0.0.1:$PORT/" node "$TMP/tool/shoot.js" "${1:-}"
echo "✓ Bitti: assets/screenshots/"

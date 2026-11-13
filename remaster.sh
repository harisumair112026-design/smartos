#!/bin/bash
# Lubuntu ISO ko "SmartOS-Lubuntu" me badalta hai: boot par Smart OS full-screen kiosk me khulta hai.
# Chalao (Ubuntu runner par):  sudo bash remaster.sh Smart_OS_V_1_110.html [SmartOS-Lubuntu.iso]
set -euo pipefail
HTML="$(readlink -f "${1:?Smart OS HTML file do}")"; OUT_NAME="${2:-SmartOS-Lubuntu.iso}"
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT_DIR="$PWD"
BASE="${LUBUNTU_BASE:-https://cdimage.ubuntu.com/lubuntu/releases/26.04.1/release}"
W="${WORKDIR:-/mnt/smartos-work}"; mkdir -p "$W"; cd "$W"
apt-get update -y && apt-get install -y squashfs-tools xorriso curl

echo "== 1/6 Lubuntu ISO ka naam dhundh raha hoon =="
NAME="${LUBUNTU_ISO:-$(curl -fsSL "$BASE/" | grep -o 'lubuntu-[0-9.]*-desktop-amd64\.iso' | sort -u | tail -1)}"
[ -n "$NAME" ] || { echo "ERROR: $BASE par Lubuntu desktop ISO nahi mili"; exit 1; }
echo "ISO: $NAME"

echo "== 2/6 Download =="
curl -fL --retry 5 --retry-delay 5 -o in.iso "$BASE/$NAME"
if curl -fsSL "$BASE/SHA256SUMS" -o SHA256SUMS 2>/dev/null; then
  EXP="$(grep -E " \*?$NAME\$" SHA256SUMS | cut -d' ' -f1 || true)"
  if [ -n "$EXP" ]; then echo "$EXP  in.iso" | sha256sum -c - ; else echo "(SHA256SUMS me naam nahi mila, check chhod raha hoon)"; fi
fi

echo "== 3/6 Squashfs layer chun raha hoon =="
mapfile -t LAYERS < <(xorriso -indev in.iso -find /casper -maxdepth 1 -type f -name '*.squashfs' 2>/dev/null | sed -n "s/^'\(.*\)'\$/\1/p")
[ "${#LAYERS[@]}" -gt 0 ] || { echo "ERROR: /casper me koi .squashfs nahi mili. ISO ka layout alag hai"; xorriso -indev in.iso -ls / 2>&1 | head -30; exit 1; }
printf 'mili layers: %s\n' "${LAYERS[@]}"
LAYER=""
for l in "${LAYERS[@]}"; do [ "$l" = "/casper/filesystem.squashfs" ] && LAYER="$l"; done
if [ -z "$LAYER" ]; then   # sabse zyada dots wali (sabse upar wali) layer
  LAYER="$(for l in "${LAYERS[@]}"; do echo "$(echo "$l" | tr -cd . | wc -c) $l"; done | sort -k1,1nr -k2 | head -1 | cut -d' ' -f2)"
fi
echo "Layer jisme Smart OS jodunga: $LAYER"
xorriso -osirrox on -indev in.iso -extract "$LAYER" layer.squashfs
COMP="$(unsquashfs -s layer.squashfs | sed -n 's/^Compression //p' | head -1)"; BS="$(unsquashfs -s layer.squashfs | sed -n 's/^Block size //p' | head -1)"
echo "compression=$COMP block=$BS"
rm -rf tree; unsquashfs -f -d tree layer.squashfs >/dev/null

echo "== 4/6 Smart OS files daal raha hoon =="
install -d tree/opt/smartos tree/usr/local/bin tree/etc/xdg/autostart tree/usr/share/applications
cp "$HTML" tree/opt/smartos/index.html
python3 - <<PY
p='tree/opt/smartos/index.html'
s=open(p,encoding='utf-8').read()
js=open('$HERE/linuxapps.js',encoding='utf-8').read()
i=s.rfind('</body>')
open(p,'w',encoding='utf-8').write(s[:i]+'<script>\n'+js+'</script>\n'+s[i:])
PY
cp "$HERE/helper.py" tree/opt/smartos/helper.py; chmod 755 tree/opt/smartos/helper.py
cat > tree/usr/local/bin/smartos-session <<'EOS'
#!/bin/bash
# Smart OS kiosk: helper chalao, phir browser full-screen.
pgrep -f "/opt/smartos/helper.py" >/dev/null || python3 /opt/smartos/helper.py &
for i in $(seq 1 60); do (exec 3<>/dev/tcp/127.0.0.1/8080) 2>/dev/null && break; sleep 0.3; done
P="$HOME/snap/firefox/common/smartos-kiosk"; mkdir -p "$P" 2>/dev/null || P="$HOME/.smartos-kiosk"; mkdir -p "$P"
if command -v firefox >/dev/null; then B="firefox --kiosk --no-remote --profile $P"
elif command -v chromium >/dev/null; then B="chromium --kiosk --user-data-dir=$P --no-first-run"
else B="xdg-open"; fi
exec $B http://localhost:8080/
EOS
chmod 755 tree/usr/local/bin/smartos-session
cat > tree/etc/xdg/autostart/smartos.desktop <<'EOS'
[Desktop Entry]
Type=Application
Name=Smart OS
Exec=/usr/local/bin/smartos-session
X-LXQt-Need-Tray=false
EOS
cat > tree/usr/share/applications/smartos.desktop <<'EOS'
[Desktop Entry]
Type=Application
Name=Smart OS
Comment=Smart OS full-screen kholo
Exec=/usr/local/bin/smartos-session
Icon=computer
Categories=System;
EOS

echo "== 5/6 Squashfs dobara bana raha hoon (kuch minute lagte hain) =="
EXTRA=""; [ "$COMP" = "xz" ] && EXTRA="-Xbcj x86"
mksquashfs tree new.squashfs -comp "$COMP" -b "$BS" -noappend $EXTRA >/dev/null
ls -lh layer.squashfs new.squashfs

echo "== 6/6 ISO dobara pack kar raha hoon (boot settings waisi hi rakhte hue) =="
rm -rf tree layer.squashfs
case "$OUT_NAME" in /*) OUT="$OUT_NAME";; *) OUT="$OUT_DIR/$OUT_NAME";; esac
xorriso -indev in.iso -outdev "$OUT" -boot_image any replay -rm "$LAYER" -- -map new.squashfs "$LAYER" -commit
ls -lh "$OUT"
echo "DONE: $OUT"

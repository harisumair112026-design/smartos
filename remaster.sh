#!/bin/bash
# Lubuntu ISO -> "Smart OS" ISO (Lubuntu/Ubuntu ka kernel waisa hi; install screen, boot menu, boot splash Smart OS ki).
# Chalao:  sudo bash remaster.sh Smart_OS_V_1_110.html [SmartOS-Lubuntu.iso]
set -euo pipefail
HTML="$(readlink -f "${1:?Smart OS HTML file do}")"; OUT_NAME="${2:-SmartOS-Lubuntu.iso}"
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT_DIR="$PWD"
BASE="${LUBUNTU_BASE:-https://cdimage.ubuntu.com/lubuntu/releases/26.04.1/release}"
W="${WORKDIR:-/mnt/smartos-work}"; mkdir -p "$W"; cd "$W"
SITE="https://github.com/harisumair112026-design/smartos"
apt-get update -y && apt-get install -y squashfs-tools xorriso curl cpio gzip librsvg2-bin fonts-dejavu-core initramfs-tools-core zstd

echo "== 1/7 Lubuntu ISO ka naam =="
NAME="${LUBUNTU_ISO:-$(curl -fsSL "$BASE/" | grep -o 'lubuntu-[0-9.]*-desktop-amd64\.iso' | sort -u | tail -1)}"
[ -n "$NAME" ] || { echo "ERROR: Lubuntu desktop ISO nahi mili"; exit 1; }
echo "ISO: $NAME"

echo "== 2/7 Download =="
curl -fL --retry 5 --retry-delay 5 -o in.iso "$BASE/$NAME"
if curl -fsSL "$BASE/SHA256SUMS" -o SHA256SUMS 2>/dev/null; then
  EXP="$(grep -E " \*?$NAME\$" SHA256SUMS | cut -d' ' -f1 || true)"
  if [ -n "$EXP" ]; then echo "$EXP  in.iso" | sha256sum -c - ; fi
fi

echo "== 3/7 Squashfs layer chun raha hoon =="
mapfile -t LAYERS < <(xorriso -indev in.iso -find /casper -maxdepth 1 -type f -name '*.squashfs' 2>/dev/null | sed -n "s/^'\(.*\)'\$/\1/p")
[ "${#LAYERS[@]}" -gt 0 ] || { echo "ERROR: /casper me .squashfs nahi mili"; exit 1; }
LAYER=""; for l in "${LAYERS[@]}"; do [ "$l" = "/casper/filesystem.squashfs" ] && LAYER="$l"; done
[ -n "$LAYER" ] || LAYER="$(for l in "${LAYERS[@]}"; do echo "$(echo "$l" | tr -cd . | wc -c) $l"; done | sort -k1,1nr -k2 | head -1 | cut -d' ' -f2)"
echo "Layer: $LAYER"
xorriso -osirrox on -indev in.iso -extract "$LAYER" layer.squashfs
COMP="$(unsquashfs -s layer.squashfs | sed -n 's/^Compression //p' | head -1)"; BS="$(unsquashfs -s layer.squashfs | sed -n 's/^Block size //p' | head -1)"
rm -rf tree; unsquashfs -f -d tree layer.squashfs >/dev/null

echo "== 4/7 Smart OS files + kiosk =="
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

echo "== 5/7 Rebrand: logo/images banana =="
mkdir -p art
# Apna logo: repo me branding/logo.png rakho (chorus PNG, transparent). Mile to wahi use hota hai.
export SMARTOS_LOGO="$(dirname "$(readlink -f "$0")")/branding/logo.png"
[ -f "$SMARTOS_LOGO" ] && echo "Custom logo mila: $SMARTOS_LOGO" || echo "Custom logo nahi mila, default 'S' logo banega"
png_size(){ python3 -c "import struct,sys;d=open(sys.argv[1],'rb').read(24);print(*struct.unpack('>II',d[16:24]))" "$1"; }
mkart(){ # naam W H style  -> art/naam.png
  python3 - "$1" "$2" "$3" "$4" <<'PY'
import sys,os,base64
n,w,h,style=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]
s=min(w,h)
LG=os.environ.get('SMARTOS_LOGO','')
if LG and os.path.exists(LG):
    uri='data:image/png;base64,'+base64.b64encode(open(LG,'rb').read()).decode()
    logo=lambda x,y,z:f'<image x="{x}" y="{y}" width="{z}" height="{z}" preserveAspectRatio="xMidYMid meet" href="{uri}"/>'
else:
  logo=lambda x,y,z:f'<g transform="translate({x},{y}) scale({z/256})"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f8cff"/><stop offset="1" stop-color="#1d3fa8"/></linearGradient></defs><rect x="8" y="8" width="240" height="240" rx="52" fill="url(#g)"/><text x="128" y="188" font-family="DejaVu Sans" font-weight="bold" font-size="176" text-anchor="middle" fill="#ffffff">S</text></g>'
if style=='icon':
    body=logo(0,0,s)
elif style=='transparent':   # plymouth: logo + naam, transparent
    z=min(h*0.62,w*0.5);body=logo((w-z)/2,h*0.04,z)+f'<text x="{w/2}" y="{h*0.93}" font-family="DejaVu Sans" font-weight="bold" font-size="{h*0.2}" text-anchor="middle" fill="#ffffff">Smart OS</text>'
else:                        # welcome: gaharа background + logo + naam
    z=min(h*0.5,w*0.3);body=f'<rect width="{w}" height="{h}" fill="#0b1b3a"/>'+logo(w/2-z/2,h*0.18,z)+f'<text x="{w/2}" y="{h*0.82}" font-family="DejaVu Sans" font-weight="bold" font-size="{h*0.13}" text-anchor="middle" fill="#ffffff">Smart OS</text>'
open(f'art/{n}.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>')
PY
  rsvg-convert -w "$2" -h "$3" "art/$1.svg" -o "art/$1.png"
}
BR=tree/etc/calamares/branding
if [ -d "$BR/lubuntu" ]; then
  echo "-- Calamares install screen --"
  rm -rf "$BR/smartos"; cp -a "$BR/lubuntu" "$BR/smartos"; rm -rf "$BR/lubuntu" "$BR/smartos/lang"
  for f in logo icon welcome welcome-oem; do
    if [ -f "$BR/smartos/$f.png" ]; then read w h < <(png_size "$BR/smartos/$f.png"); st=welcome; [ "$f" = icon ] && st=icon; [ "$f" = logo ] && st=icon
      mkart "$f" "$w" "$h" "$st" && cp "art/$f.png" "$BR/smartos/$f.png"; fi
  done
  rm -f "$BR/smartos"/{apps,desktop,enjoy,lightweight,store,support}.png
  cat > "$BR/smartos/branding.desc" <<'EOS'
---
componentName: smartos

windowExpanding:    fullscreen

strings:
    productName:         Smart OS
    shortProductName:    Smart OS
    version:             26.04
    shortVersion:        26.04
    versionedName:       Smart OS
    shortVersionedName:  Smart OS 26.04
    bootloaderEntryName: Smart OS
    productUrl:          ""
    supportUrl:          ""
    knownIssuesUrl:      ""
    releaseNotesUrl:     ""

images:
    productLogo:         "logo.png"
    productIcon:         "icon.png"
    productWelcome:      "welcome.png"

slideshow:               "show.qml"

slideshowAPI:            1

style:
   SidebarBackground:    "#0b1b3a"
   SidebarText:          "#FFFFFF"
   SidebarTextCurrent:   "#4f8cff"
EOS
  cat > "$BR/smartos/show.qml" <<'EOS'
import QtQuick 2.0;
import calamares.slideshow 1.0;
Presentation {
    id: presentation
    Timer { interval: 6000; running: true; repeat: true; onTriggered: presentation.goToNextSlide() }
    Slide { Rectangle { anchors.fill: parent; color: "#0b1b3a"
        Text { anchors.centerIn: parent; horizontalAlignment: Text.AlignHCenter; color: "white"; font.pixelSize: 36; text: "Smart OS\nInstall ho raha hai..." } } }
    Slide { Rectangle { anchors.fill: parent; color: "#0b1b3a"
        Text { anchors.centerIn: parent; horizontalAlignment: Text.AlignHCenter; color: "white"; font.pixelSize: 30; text: "Halka, tez aur aapka apna OS" } } }
    Slide { Rectangle { anchors.fill: parent; color: "#0b1b3a"
        Text { anchors.centerIn: parent; horizontalAlignment: Text.AlignHCenter; color: "white"; font.pixelSize: 30; text: "Bas thodi der aur..." } } }
}
EOS
  S=tree/etc/calamares/settings.conf
  if grep -q '^branding:' "$S"; then sed -i 's/^branding:.*/branding: smartos/' "$S"; else echo 'branding: smartos' >> "$S"; fi
  grep -n '^branding:' "$S"
else echo "WARN: Calamares lubuntu branding nahi mili"; fi
# Installer prompt / desktop launchers me Lubuntu naam
[ -f tree/usr/bin/lubuntu-installer-prompt ] && sed -i 's/Lubuntu/Smart OS/g' tree/usr/bin/lubuntu-installer-prompt || true
grep -rIl 'Lubuntu' tree/usr/share/applications tree/etc/xdg 2>/dev/null | while read -r f; do sed -i -E '/^(Name|Comment|GenericName)(\[[^]]*\])?=/ s/Lubuntu/Smart OS/g' "$f"; done || true
# OS naam (ID=ubuntu waisa hi, taaki apt/tools na tootein)
install -d tree/usr/lib tree/etc
cat > tree/usr/lib/os-release <<EOS
PRETTY_NAME="Smart OS 26.04 (Ubuntu base)"
NAME="Smart OS"
VERSION_ID="26.04"
VERSION="26.04.1 (Resolute Raccoon)"
VERSION_CODENAME=resolute
ID=ubuntu
ID_LIKE=debian
HOME_URL="$SITE"
SUPPORT_URL="$SITE"
BUG_REPORT_URL="$SITE/issues"
UBUNTU_CODENAME=resolute
EOS
rm -f tree/etc/os-release; ln -s ../usr/lib/os-release tree/etc/os-release
printf 'Smart OS 26.04.1 \\n \\l\n' > tree/etc/issue; printf 'Smart OS 26.04.1\n' > tree/etc/issue.net
cat > tree/etc/lsb-release <<'EOS'
DISTRIB_ID=Ubuntu
DISTRIB_RELEASE=26.04
DISTRIB_CODENAME=resolute
DISTRIB_DESCRIPTION="Smart OS 26.04.1"
EOS

echo "== 6/7 Boot splash (initrd) + boot menu (GRUB) =="
EXTRA_MAPS=()
xorriso -osirrox on -indev in.iso -extract /casper/initrd initrd.orig >/dev/null 2>&1 || true
if [ -s initrd.orig ]; then
  rm -rf ird; unmkinitramfs initrd.orig ird >/dev/null 2>&1 || true
  TD="$(find ird -type d -path '*usr/share/plymouth/themes/spinner' | head -1)"
  if [ -n "$TD" ]; then
    rm -rf stage; mkdir -p stage/usr/share/plymouth/themes/spinner
    for f in bgrt-fallback watermark; do
      if [ -f "$TD/$f.png" ]; then read w h < <(png_size "$TD/$f.png"); mkart "pl_$f" "$w" "$h" transparent && cp "art/pl_$f.png" "stage/usr/share/plymouth/themes/spinner/$f.png"; fi
    done
    ls -la stage/usr/share/plymouth/themes/spinner
    (cd stage && find . | cpio -o -H newc --quiet) | gzip -9 > extra.cpio.gz
    cat initrd.orig extra.cpio.gz > initrd.new
    EXTRA_MAPS+=(-rm /casper/initrd -- -map initrd.new /casper/initrd)
  else echo "WARN: plymouth spinner theme initrd me nahi mili"; fi
else echo "WARN: initrd extract nahi hua"; fi

cat > grub.cfg <<'EOS'
set timeout=10

loadfont unicode

set menu_color_normal=white/blue
set menu_color_highlight=black/light-cyan

menuentry "Try or Install Smart OS" {
    set gfxpayload=keep
    linux  /casper/vmlinuz  --- quiet splash
    initrd /casper/initrd
}
menuentry "Smart OS (safe graphics)" {
    set gfxpayload=keep
    linux  /casper/vmlinuz nomodeset  --- quiet splash
    initrd /casper/initrd
}
menuentry "Smart OS (text mode, bina splash - debugging)" {
    set gfxpayload=keep
    linux  /casper/vmlinuz nomodeset  ---
    initrd /casper/initrd
}
grub_platform
if [ "$grub_platform" = "efi" ]; then
menuentry 'Boot from next volume' {
    exit 1
}
menuentry 'UEFI Firmware Settings' {
    fwsetup
}
fi
EOS
sed -e 's#--- quiet splash#iso-scan/filename=${iso_path} --- quiet splash#' -e 's#--- *$#iso-scan/filename=${iso_path} ---#' grub.cfg | sed -n '1,/^grub_platform/p' | sed '$d' > loopback.cfg
EXTRA_MAPS+=(-rm /boot/grub/grub.cfg -- -map grub.cfg /boot/grub/grub.cfg -rm /boot/grub/loopback.cfg -- -map loopback.cfg /boot/grub/loopback.cfg)
if xorriso -osirrox on -indev in.iso -extract /.disk/info disk.info >/dev/null 2>&1 && [ -s disk.info ]; then
  sed -i 's/Lubuntu/Smart OS/g' disk.info; EXTRA_MAPS+=(-rm /.disk/info -- -map disk.info /.disk/info)
fi

echo "== 7/7 Squashfs + ISO pack =="
EXTRA=""; [ "$COMP" = "xz" ] && EXTRA="-Xbcj x86"
mksquashfs tree new.squashfs -comp "$COMP" -b "$BS" -noappend $EXTRA >/dev/null
rm -rf tree layer.squashfs
case "$OUT_NAME" in /*) OUT="$OUT_NAME";; *) OUT="$OUT_DIR/$OUT_NAME";; esac
xorriso -indev in.iso -outdev "$OUT" -boot_image any replay -volid "Smart OS 26.04.1" \
  -rm "$LAYER" -- -map new.squashfs "$LAYER" "${EXTRA_MAPS[@]}" -commit
ls -lh "$OUT"

echo "== Jaanch: nayi ISO me kya hai =="
xorriso -indev "$OUT" -osirrox on -extract /boot/grub/grub.cfg chk.cfg >/dev/null 2>&1 && head -12 chk.cfg || true
xorriso -indev "$OUT" -osirrox on -extract /.disk/info chk.info >/dev/null 2>&1 && cat chk.info || true
xorriso -indev "$OUT" 2>&1 | grep -E "Volume id|Boot record" || true
echo "DONE: $OUT"

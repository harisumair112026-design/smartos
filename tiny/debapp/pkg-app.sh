#!/bin/bash
# usage: pkg-app.sh <version> <index.html> <outdir>
set -e; V=$1; IDX=$2; OUT=$3; H=$(cd "$(dirname "$0")/../.." && pwd); P=$(mktemp -d)
mkdir -p $P/DEBIAN $P/opt/smartos $P/usr/bin $P/usr/share/xsessions $P/usr/share/applications $P/usr/share/pixmaps
cp "$IDX" $P/opt/smartos/index.html; cp $H/helper.py $P/opt/smartos/helper.py
cp $H/branding/logo.png $P/opt/smartos/logo.png; cp $H/branding/logo.png $P/usr/share/pixmaps/smartos.png
cp $H/tiny/deb/install.html $P/opt/smartos/install.html
install -m755 $H/tiny/debapp/smartos-app $P/usr/bin/smartos-app
install -m755 $H/tiny/debapp/smartos-desktop $P/usr/bin/smartos-desktop
echo "$V" > $P/opt/smartos/app-version
cat > $P/usr/share/applications/smartos.desktop <<D
[Desktop Entry]
Type=Application
Name=Smart OS
Comment=Smart OS desktop by Smart Miner Hubs
Exec=smartos-app
Icon=smartos
Categories=System;Utility;
Terminal=false
D
cat > $P/usr/share/xsessions/smartos.desktop <<D
[Desktop Entry]
Name=Smart OS
Comment=Smart OS desktop (launcher)
Exec=/usr/bin/smartos-desktop
Type=Application
D
cat > $P/DEBIAN/control <<D
Package: smartos-app
Version: $V
Architecture: all
Maintainer: Smart Miner Hubs <noreply@example.com>
Depends: python3, curl, xdotool, wmctrl, x11-utils, xterm, google-chrome-stable | chromium | chromium-browser
Recommends: openbox, pcmanfm, featherpad, network-manager-gnome
Section: x11
Priority: optional
Description: Smart OS desktop app
 Smart OS ko Debian ya Ubuntu par ek app ki tarah chalao.
 Start menu me "Smart OS" dhundho, ya login screen se Smart OS session chuno.
D
mkdir -p "$OUT"; dpkg-deb --root-owner-group -Zxz -b $P "$OUT/smartos-app_${V}_all.deb"; rm -rf $P

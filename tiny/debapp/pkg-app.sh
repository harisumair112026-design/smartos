#!/bin/bash
# usage: pkg-app.sh <version> <index.html> <outdir>
set -e; V=$1; IDX=$2; OUT=$3; H=$(cd "$(dirname "$0")/../.." && pwd); P=$(mktemp -d)
mkdir -p $P/usr/share/backgrounds
cp $H/tiny/splash/bg.png $P/usr/share/backgrounds/smartos.png
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
Depends: python3, curl, openbox, xdotool, wmctrl, x11-utils, xterm, google-chrome-stable | chromium | chromium-browser
Recommends: pcmanfm, featherpad, network-manager-gnome
Section: x11
Priority: optional
Description: Smart OS desktop app
 Smart OS ko Debian ya Ubuntu par ek app ki tarah chalao.
 Start menu me "Smart OS" dhundho, ya login screen se Smart OS session chuno.
D
cat > $P/DEBIAN/postinst <<'D'
#!/bin/sh
set -e
if [ "$1" = configure ]; then
  # LightDM: default session + login screen ka background
  if [ -d /etc/lightdm ] || command -v lightdm >/dev/null 2>&1; then
    mkdir -p /etc/lightdm/lightdm.conf.d /etc/lightdm/lightdm-gtk-greeter.conf.d
    printf '[Seat:*]\nuser-session=smartos\n' > /etc/lightdm/lightdm.conf.d/50-smartos.conf
    printf '[greeter]\nbackground=/usr/share/backgrounds/smartos.png\n' > /etc/lightdm/lightdm-gtk-greeter.conf.d/50-smartos.conf
  fi
  [ -f /etc/lightdm/lightdm-gtk-greeter.conf.d/50-smartos.conf ] && printf 'theme-name=Adwaita-dark\nfont-name=Sans 12\nuser-background=false\nposition=50%%,center\nindicators=~host;~spacer;~clock;~spacer;~session;~power\nclock-format=%%H:%%M  %%d %%b\n' >> /etc/lightdm/lightdm-gtk-greeter.conf.d/50-smartos.conf
  # GDM3: login screen logo
  if [ -d /etc/gdm3 ]; then
    mkdir -p /etc/dconf/db/gdm.d /etc/dconf/profile
    printf "[org/gnome/login-screen]\nlogo='/usr/share/pixmaps/smartos.png'\n" > /etc/dconf/db/gdm.d/50-smartos
    [ -f /etc/dconf/profile/gdm ] || printf 'user-db:user\nsystem-db:gdm\nfile-db:/usr/share/gdm/greeter-dconf-defaults\n' > /etc/dconf/profile/gdm
    dconf update 2>/dev/null || true
  fi
  # GDM3: har maujooda user ka default session
  if [ -d /var/lib/AccountsService/users ]; then
    for f in /var/lib/AccountsService/users/*; do
      [ -f "$f" ] || continue
      cp -n "$f" "$f.smartos-bak" 2>/dev/null || true
      sed -i '/^XSession=/d;/^Session=/d' "$f"
      grep -q '^\[User\]' "$f" || echo '[User]' >> "$f"
      sed -i 's/^\[User\]/[User]\nXSession=smartos\nSession=smartos/' "$f"
    done
  fi
  # GDM: Wayland band (Smart OS session X11 par chalta hai)
  if [ -f /etc/gdm3/custom.conf ]; then
    cp -n /etc/gdm3/custom.conf /etc/gdm3/custom.conf.smartos-bak 2>/dev/null || true
    if grep -q '^#\?WaylandEnable' /etc/gdm3/custom.conf; then sed -i 's/^#\?WaylandEnable.*/WaylandEnable=false/' /etc/gdm3/custom.conf
    else sed -i '0,/^\[daemon\]/s//[daemon]\nWaylandEnable=false/' /etc/gdm3/custom.conf; fi
  fi
  # SDDM
  if command -v sddm >/dev/null 2>&1; then
    mkdir -p /etc/sddm.conf.d; printf '[General]\nSession=smartos.desktop\n' > /etc/sddm.conf.d/50-smartos.conf
  fi
fi
exit 0
D
cat > $P/DEBIAN/prerm <<'D'
#!/bin/sh
set -e
if [ "$1" = remove ] || [ "$1" = purge ]; then
  [ -f /etc/gdm3/custom.conf.smartos-bak ] && mv -f /etc/gdm3/custom.conf.smartos-bak /etc/gdm3/custom.conf || true
  rm -f /etc/dconf/db/gdm.d/50-smartos; dconf update 2>/dev/null || true
  rm -f /etc/lightdm/lightdm.conf.d/50-smartos.conf /etc/lightdm/lightdm-gtk-greeter.conf.d/50-smartos.conf /etc/sddm.conf.d/50-smartos.conf
  for f in /var/lib/AccountsService/users/*.smartos-bak; do
    [ -f "$f" ] && mv -f "$f" "${f%.smartos-bak}" || true
  done
fi
exit 0
D
chmod 755 $P/DEBIAN/postinst $P/DEBIAN/prerm
mkdir -p "$OUT"; dpkg-deb --root-owner-group -Zxz -b $P "$OUT/smartos-app_${V}_all.deb"; rm -rf $P

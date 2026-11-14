#!/bin/bash
# SDDM login screen, wallpaper aur LXQt panel ki Lubuntu cheezein dhundta hai (kuch badalta nahi).
set -uo pipefail
BASE="https://cdimage.ubuntu.com/lubuntu/releases/26.04.1/release"
W=/mnt/inspect2; mkdir -p $W; cd $W
apt-get update -y >/dev/null && apt-get install -y squashfs-tools xorriso curl >/dev/null 2>&1
NAME="$(curl -fsSL "$BASE/" | grep -o 'lubuntu-[0-9.]*-desktop-amd64\.iso' | sort -u | tail -1)"
curl -fL --retry 5 -o in.iso "$BASE/$NAME"
for L in $(xorriso -indev in.iso -find /casper -maxdepth 1 -name '*.squashfs' 2>/dev/null | tr -d "'"); do
  b=$(basename $L); xorriso -osirrox on -indev in.iso -extract $L $b >/dev/null 2>&1
  echo; echo "########## LAYER $b"
  unsquashfs -l $b 2>/dev/null | sed 's#^squashfs-root##' > $b.list
  echo "--- sddm themes"; grep -E '^/usr/share/sddm/(themes|scripts)' $b.list | grep -v -E '/(translations|locale)/' | head -60
  echo "--- sddm conf"; grep -E '^/(etc|usr/lib)/sddm' $b.list | head -20
  echo "--- lubuntu artwork/wallpapers"; grep -i -E '^/usr/share/(lubuntu|wallpapers|backgrounds|lxqt/themes|desktop-base)|lubuntu-artwork|/lubuntu/.*\.(png|jpg|jpeg|svg)$' $b.list | head -60
  echo "--- lxqt panel/session/menu"; grep -E '^/(etc|usr/share)/(xdg/lxqt|lxqt)/' $b.list | grep -v -E '/translations/' | head -50
  echo "--- start-menu icons"; grep -i -E 'distributor-logo|start-here|lubuntu-logo|lubuntu.*(svg|png)$' $b.list | head -30
  echo "--- FILE CONTENTS"
  for p in etc/sddm.conf.d/lubuntu_settings.conf usr/share/sddm/themes/lubuntu/theme.conf usr/share/sddm/themes/lubuntu/metadata.desktop etc/xdg/lxqt/panel.conf usr/share/lxqt/panel.conf etc/xdg/lxqt/lxqt.conf usr/share/lxqt/lxqt.conf; do
    out=$(unsquashfs -cat $b $p 2>/dev/null); [ -n "$out" ] && { echo "--- $b :: $p"; echo "$out" | head -70; }
  done
  rm -f $b
done
echo "INSPECT2 DONE"

#!/bin/bash
# Lubuntu ISO ka structure log me dikhata hai (kuch badalta nahi). Rebrand banane se pehle jaanch.
set -uo pipefail
BASE="https://cdimage.ubuntu.com/lubuntu/releases/26.04.1/release"
W=/mnt/inspect; mkdir -p $W; cd $W
apt-get update -y >/dev/null && apt-get install -y squashfs-tools xorriso curl initramfs-tools-core zstd cpio >/dev/null 2>&1
NAME="$(curl -fsSL "$BASE/" | grep -o 'lubuntu-[0-9.]*-desktop-amd64\.iso' | sort -u | tail -1)"
curl -fL --retry 5 -o in.iso "$BASE/$NAME"
hr(){ echo; echo "########## $*"; }
hr "ISO root"; xorriso -indev in.iso -ls / 2>/dev/null | tr '\n' ' '; echo
hr "boot/ & isolinux"; xorriso -indev in.iso -find /boot -maxdepth 2 2>/dev/null | head -40; xorriso -indev in.iso -ls /isolinux 2>/dev/null | head
hr "/casper"; xorriso -indev in.iso -find /casper -maxdepth 1 2>/dev/null
for f in /boot/grub/grub.cfg /boot/grub/loopback.cfg /isolinux/txt.cfg /isolinux/isolinux.cfg; do
  if xorriso -indev in.iso -osirrox on -extract $f x.cfg >/dev/null 2>&1 && [ -s x.cfg ]; then hr "FILE $f"; cat x.cfg | head -80; rm -f x.cfg; fi
done
hr "boot/grub tree"; xorriso -indev in.iso -find /boot/grub -maxdepth 2 -type d 2>/dev/null | head -20
hr "initrd plymouth"
xorriso -osirrox on -indev in.iso -extract /casper/initrd initrd.img >/dev/null 2>&1 || true
if [ -s initrd.img ]; then rm -rf ird; unmkinitramfs initrd.img ird 2>&1 | head -3; find ird -path '*plymouth*' \( -name '*.plymouth' -o -name '*.png' -o -name '*.script' -o -name '*.so' \) 2>/dev/null | head -50; ls ird 2>/dev/null; readlink -f ird/main/usr/share/plymouth/themes/default.plymouth 2>/dev/null; fi
hr "squashfs layers"
for L in $(xorriso -indev in.iso -find /casper -maxdepth 1 -name '*.squashfs' 2>/dev/null | tr -d "'"); do
  b=$(basename $L); xorriso -osirrox on -indev in.iso -extract $L $b >/dev/null 2>&1
  hr "LAYER $b"; unsquashfs -s $b | grep -E 'Compression|Filesystem size'
  unsquashfs -l $b 2>/dev/null | grep -iE 'calamares|plymouth/themes|sddm|lubuntu-artwork|/usr/share/lubuntu|branding|slideshow|os-release|lsb-release|issue|grub/|wallpaper|desktop-base|installer' | grep -v -E '/(locale|translations|help)/|\.mo$|\.qm$' | head -120
  rm -f $b
done
hr "FILES from layers"
for L in $(xorriso -indev in.iso -find /casper -maxdepth 1 -name '*.squashfs' 2>/dev/null | tr -d "'"); do
  b=$(basename $L); xorriso -osirrox on -indev in.iso -extract $L $b >/dev/null 2>&1
  for p in etc/calamares/settings.conf etc/os-release etc/lsb-release etc/issue etc/default/grub etc/plymouth/plymouthd.conf usr/share/plymouth/plymouthd.defaults etc/sddm.conf; do
     out=$(unsquashfs -cat $b $p 2>/dev/null); [ -n "$out" ] && { echo "--- $b :: $p"; echo "$out" | head -60; }
  done
  for d in $(unsquashfs -l $b 2>/dev/null | grep -oE 'squashfs-root/(usr/share|etc)/calamares/branding/[^/]+/branding.desc' ); do
     echo "--- $b :: ${d#squashfs-root/}"; unsquashfs -cat $b "${d#squashfs-root/}" 2>/dev/null | head -120
  done
  rm -f $b
done
echo; echo "INSPECT DONE"

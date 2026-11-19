#!/bin/bash
# initramfs + grub ISO. out/ me vmlinuz, smartos.sfs hona chahiye
set -euo pipefail
O="$(pwd)/out"; W=$(mktemp -d)
mkdir -p $W/i/{bin,sbin,dev,proc,sys,iso,ro,rw,new}
cp /bin/busybox $W/i/bin/busybox
(cd $W/i/bin && for a in $(./busybox --list); do [ "$a" = busybox ] || ln -sf busybox "$a"; done)
mknod -m 600 $W/i/dev/console c 5 1; mknod -m 666 $W/i/dev/null c 1 3
cp tiny/init $W/i/init; chmod 755 $W/i/init
(cd $W/i && find . | cpio -o -H newc --quiet | gzip -9) > $W/initrd.gz
I=$W/iso; mkdir -p $I/boot/grub
cp $O/vmlinuz $I/boot/vmlinuz; cp $W/initrd.gz $I/boot/initrd.gz; cp $O/smartos.sfs $I/smartos.sfs
cp tiny/splash/bg.png $I/boot/grub/bg.png
cat > $I/boot/grub/grub.cfg <<'G'
set timeout=3
set default=0
insmod all_video
insmod gfxterm
insmod png
set gfxmode=1024x768,auto
set gfxpayload=keep
terminal_output gfxterm
background_image /boot/grub/bg.png
set menu_color_normal=white/black
set menu_color_highlight=black/light-cyan
menuentry "Smart OS" {
  linux /boot/vmlinuz quiet splash loglevel=3 console=ttyS0,115200 vt.global_cursor_default=0
  initrd /boot/initrd.gz
}
menuentry "Smart OS Install (disk par install karo)" {
  linux /boot/vmlinuz quiet splash loglevel=3 smartos.install console=ttyS0,115200 vt.global_cursor_default=0
  initrd /boot/initrd.gz
}
menuentry "Smart OS (safe graphics)" {
  linux /boot/vmlinuz nomodeset quiet loglevel=3 console=ttyS0,115200 console=tty0
  initrd /boot/initrd.gz
}
menuentry "Smart OS (debug, text)" {
  linux /boot/vmlinuz loglevel=7 console=ttyS0,115200 console=tty0
  initrd /boot/initrd.gz
}
G
grub-mkrescue -o $O/SmartOS-Tiny.iso $I -- -volid SMARTOS >/dev/null 2>&1
ls -lh $O/SmartOS-Tiny.iso $W/initrd.gz
sha256sum $O/SmartOS-Tiny.iso | tee $O/SmartOS-Tiny.iso.sha256

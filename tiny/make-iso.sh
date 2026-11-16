#!/bin/bash
# initramfs + grub ISO. out/ me vmlinuz, smartos.sfs hona chahiye
set -euo pipefail
O="$(pwd)/out"; W=$(mktemp -d)
mkdir -p $W/i/{bin,sbin,dev,proc,sys,iso,ro,rw,new}
cp /bin/busybox $W/i/bin/busybox
(cd $W/i/bin && for a in $(./busybox --list); do ln -sf busybox "$a"; done)
mknod -m 600 $W/i/dev/console c 5 1; mknod -m 666 $W/i/dev/null c 1 3
cp tiny/init $W/i/init; chmod 755 $W/i/init
(cd $W/i && find . | cpio -o -H newc --quiet | gzip -9) > $W/initrd.gz
I=$W/iso; mkdir -p $I/boot/grub
cp $O/vmlinuz $I/boot/vmlinuz; cp $W/initrd.gz $I/boot/initrd.gz; cp $O/smartos.sfs $I/smartos.sfs
cat > $I/boot/grub/grub.cfg <<'G'
set timeout=1
set default=0
menuentry "Smart OS" {
  linux /boot/vmlinuz quiet loglevel=3 console=ttyS0,115200 console=tty0
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

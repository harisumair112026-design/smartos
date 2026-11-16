#!/bin/sh
# Alpine container ke andar chalta hai (privileged). /w = repo, /w/out = output
set -e
apk add --no-cache squashfs-tools busybox-static >/dev/null
R=/w/out/rootfs; rm -rf $R; mkdir -p $R/etc/apk
cp /etc/apk/repositories $R/etc/apk/
A="apk --root $R --initdb --keys-dir /etc/apk/keys --repositories-file /etc/apk/repositories --no-cache"
$A add alpine-base openrc busybox-openrc eudev eudev-openrc udev-init-scripts udev-init-scripts-openrc \
  dbus dbus-openrc networkmanager networkmanager-wifi networkmanager-cli networkmanager-openrc wpa_supplicant iw wireless-regdb \
  seatd seatd-openrc cage firefox mesa-dri-gallium mesa-egl mesa-gles mesa-gbm libinput xkeyboard-config font-dejavu \
  python3 doas alsa-utils shadow
for p in linux-firmware-iwlwifi linux-firmware-rtlwifi linux-firmware-rtw88 linux-firmware-ath9k_htc linux-firmware-ath10k \
  linux-firmware-ath11k linux-firmware-brcm linux-firmware-mediatek linux-firmware-rtl_nic linux-firmware-intel linux-firmware-amdgpu \
  foot pcmanfm mousepad; do $A add $p 2>/dev/null || echo "skip $p"; done
# kernel modules + firmware khud ke
cp -a /w/out/modroot/lib/modules $R/lib/
# Smart OS files
mkdir -p $R/opt/smartos $R/usr/local/bin
cp /w/out/index.html $R/opt/smartos/index.html
cp /w/helper.py $R/opt/smartos/helper.py
sed -i 's|subprocess.Popen(\["systemctl", act\])|subprocess.Popen(["doas", act])|' $R/opt/smartos/helper.py
cp /w/tiny/smartos-wl $R/usr/local/bin/smartos-wl; chmod 755 $R/usr/local/bin/smartos-wl
cp /w/tiny/inittab $R/etc/inittab
cp /w/tiny/autologin $R/usr/local/bin/autologin; chmod 755 $R/usr/local/bin/autologin
echo "permit nopass smart" > $R/etc/doas.d/smart.conf 2>/dev/null || { mkdir -p $R/etc/doas.d; echo "permit nopass smart" > $R/etc/doas.d/smart.conf; }
mkdir -p $R/etc/local.d; cp /w/tiny/10-smartos.start $R/etc/local.d/; chmod 755 $R/etc/local.d/10-smartos.start
mkdir -p $R/etc/NetworkManager; printf '[main]\nplugins=keyfile\nauth-polkit=false\ndhcp=internal\n[device]\nwifi.backend=wpa_supplicant\n' > $R/etc/NetworkManager/NetworkManager.conf
echo smartos > $R/etc/hostname
printf 'nameserver 1.1.1.1\n' > $R/etc/resolv.conf
cat > $R/etc/os-release <<'OS'
NAME="Smart OS"
PRETTY_NAME="Smart OS"
ID=smartos
VERSION_ID=1.0
OS
mount -t proc proc $R/proc; mount --rbind /dev $R/dev; mount --rbind /sys $R/sys
chroot $R /bin/sh -c '
adduser -D -s /bin/sh smart; passwd -d root >/dev/null; passwd -d smart >/dev/null
for g in video audio input seat netdev wheel; do addgroup smart $g 2>/dev/null || true; done
for s in devfs dmesg; do rc-update add $s sysinit; done
rc-update add udev sysinit; rc-update add udev-trigger sysinit; rc-update add udev-settle sysinit
for s in modules sysctl hostname bootmisc syslog; do rc-update add $s boot; done
for s in dbus seatd networkmanager local; do rc-update add $s default; done
echo "[ \"\$(tty)\" = /dev/tty1 ] && exec /usr/local/bin/smartos-wl" > /home/smart/.profile
chown smart:smart /home/smart/.profile'
umount -l $R/proc $R/dev $R/sys 2>/dev/null || true
rm -rf $R/var/cache/apk/* 
mksquashfs $R /w/out/smartos.sfs -comp xz -Xbcj x86 -b 256K -noappend -quiet
ls -lh /w/out/smartos.sfs; du -sh $R

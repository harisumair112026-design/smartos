#!/bin/bash
# Debian minimal rootfs (root se chalao, runner par). out/modroot (apna kernel) pehle se hona chahiye.
set -euo pipefail
R="$(pwd)/out/rootfs"; rm -rf "$R"; mkdir -p out
S=trixie
INC=systemd-sysv,udev,dbus,kmod,network-manager,wpasupplicant,iw,wireless-regdb,rfkill,xserver-xorg-core,xserver-xorg-input-libinput,xserver-xorg-video-fbdev,xserver-xorg-video-vesa,xinit,openbox,x11-xserver-utils,unclutter,xterm,python3,sudo,fonts-dejavu-core,ca-certificates,curl,wget,alsa-utils,procps,iproute2,isc-dhcp-client,libgl1-mesa-dri,mesa-utils-bin
debootstrap --variant=minbase --arch=amd64 --include=$INC $S "$R" http://deb.debian.org/debian || { S=bookworm; rm -rf "$R"; debootstrap --variant=minbase --arch=amd64 --include=$INC $S "$R" http://deb.debian.org/debian; }
echo "Debian suite: $S"
cat > $R/etc/apt/sources.list <<APT
deb http://deb.debian.org/debian $S main contrib non-free-firmware
deb http://deb.debian.org/debian $S-updates main contrib non-free-firmware
deb http://security.debian.org/debian-security $S-security main contrib non-free-firmware
APT
mount -t proc proc $R/proc; mount --rbind /dev $R/dev; mount --rbind /sys $R/sys; cp /etc/resolv.conf $R/etc/resolv.conf
export DEBIAN_FRONTEND=noninteractive
chroot $R apt-get update -qq
for p in firmware-iwlwifi firmware-realtek firmware-atheros firmware-brcm80211 firmware-misc-nonfree firmware-amd-graphics firmware-mediatek; do chroot $R apt-get install -y -qq --no-install-recommends $p >/dev/null 2>&1 || echo "skip $p"; done
for p in fonts-noto-color-emoji fonts-noto-core; do chroot $R apt-get install -y -qq --no-install-recommends $p >/dev/null 2>&1 || echo "skip $p"; done
curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o $R/tmp/chrome.deb
chroot $R apt-get install -y -qq --no-install-recommends /tmp/chrome.deb >/dev/null
rm -f $R/tmp/chrome.deb $R/etc/apt/sources.list.d/google-chrome.list
chroot $R fc-cache -f >/dev/null 2>&1 || true
# apna kernel ke modules
cp -a out/modroot/lib/modules $R/lib/
ls $R/lib/modules
# Smart OS files
mkdir -p $R/opt/smartos $R/usr/local/bin
cp out/index.html $R/opt/smartos/index.html; cp helper.py $R/opt/smartos/helper.py
cp tiny/deb/smartos-session $R/usr/local/bin/smartos-session; chmod 755 $R/usr/local/bin/smartos-session
mkdir -p $R/etc/systemd/system/getty@tty1.service.d $R/etc/xdg/openbox
cp tiny/deb/autologin.conf $R/etc/systemd/system/getty@tty1.service.d/autologin.conf
cp tiny/deb/smartos-debug.service $R/etc/systemd/system/
echo '/usr/local/bin/smartos-session &' > $R/etc/xdg/openbox/autostart
printf 'smart ALL=(ALL) NOPASSWD: /usr/bin/systemctl, /bin/systemctl\n' > $R/etc/sudoers.d/smart; chmod 440 $R/etc/sudoers.d/smart
mkdir -p $R/etc/NetworkManager/conf.d; printf '[main]\nauth-polkit=false\n' > $R/etc/NetworkManager/conf.d/smartos.conf
echo smartos > $R/etc/hostname; : > $R/etc/fstab
printf 'NAME="Smart OS"\nPRETTY_NAME="Smart OS"\nID=smartos\nID_LIKE=debian\nVERSION_ID=1.0\n' > $R/etc/os-release
chroot $R /bin/bash -c '
useradd -m -s /bin/bash -G audio,video,input,netdev,sudo smart; passwd -d root >/dev/null; passwd -d smart >/dev/null
echo "exec openbox-session" > /home/smart/.xinitrc
echo "[ -z \"\$DISPLAY\" ] && [ \"\$(tty)\" = /dev/tty1 ] && exec startx -- -nocursor" > /home/smart/.bash_profile
chown smart:smart /home/smart/.xinitrc /home/smart/.bash_profile
systemctl enable NetworkManager smartos-debug.service
systemctl mask apt-daily.timer apt-daily-upgrade.timer systemd-networkd-wait-online.service NetworkManager-wait-online.service
systemctl set-default multi-user.target
apt-get clean'
umount -l $R/proc $R/dev $R/sys 2>/dev/null || true
rm -rf $R/var/lib/apt/lists/* $R/usr/share/doc/* $R/usr/share/man/* $R/usr/share/info/* $R/var/cache/apt/* $R/tmp/*
mksquashfs "$R" out/smartos.sfs -comp xz -Xbcj x86 -b 256K -noappend -quiet
ls -lh out/smartos.sfs; du -sh "$R"

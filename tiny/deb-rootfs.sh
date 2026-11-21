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
for p in fonts-noto-color-emoji fonts-noto-core dmz-cursor-theme xcursor-themes; do chroot $R apt-get install -y -qq --no-install-recommends $p >/dev/null 2>&1 || echo "skip $p"; done
curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o $R/tmp/chrome.deb
chroot $R apt-get install -y -qq --no-install-recommends /tmp/chrome.deb >/dev/null
rm -f $R/tmp/chrome.deb $R/etc/apt/sources.list.d/google-chrome.list
chroot $R fc-cache -f >/dev/null 2>&1 || true
# installer + boot splash tools
mkdir -p $R/etc/initramfs-tools; echo 'update_initramfs=no' > $R/etc/initramfs-tools/update-initramfs.conf
for p in "xdotool wmctrl x11-utils" "pcmanfm" "featherpad" "firefox-esr" "grub2-common grub-common grub-pc-bin grub-efi-amd64-bin" "dosfstools fdisk e2fsprogs nano less" "plymouth"; do
  chroot $R apt-get install -y --no-install-recommends -o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef $p 2>&1 | tail -15 || true
  chroot $R dpkg --configure -a 2>&1 | tail -5 || true
done
chroot $R dpkg -l | grep -E "^ii +(plymouth|pcmanfm|featherpad|firefox-esr|xdotool|wmctrl|grub2-common|grub-pc-bin|grub-efi-amd64-bin|dosfstools|fdisk) " | awk '{print "installed:",$2}' 
rm -f $R/boot/initrd.img-* $R/boot/vmlinuz-* 2>/dev/null || true
mkdir -p $R/usr/share/plymouth/themes/smartos $R/etc/plymouth
cp tiny/splash/smartos.plymouth tiny/splash/smartos.script tiny/splash/logo.png $R/usr/share/plymouth/themes/smartos/
printf '[Daemon]\nTheme=smartos\nShowDelay=0\n' > $R/etc/plymouth/plymouthd.conf
# apna kernel ke modules
cp -a out/modroot/lib/modules $R/lib/
ls $R/lib/modules
# Smart OS files
mkdir -p $R/opt/smartos $R/usr/local/bin
cp out/index.html $R/opt/smartos/index.html; cp helper.py $R/opt/smartos/helper.py
cp tiny/deb/smartos-session tiny/deb/smartos-install tiny/deb/smartos-update-apply $R/usr/local/bin/; chmod 755 $R/usr/local/bin/smartos-session $R/usr/local/bin/smartos-install $R/usr/local/bin/smartos-update-apply
echo "${SMARTOS_BUILD:-0}" > $R/etc/smartos-version
cp tiny/deb/install.html $R/opt/smartos/install.html; cp branding/logo.png $R/opt/smartos/logo.png
mkdir -p $R/etc/systemd/system/getty@tty1.service.d $R/etc/xdg/openbox
cp tiny/deb/autologin.conf $R/etc/systemd/system/getty@tty1.service.d/autologin.conf
cp tiny/deb/smartos-debug.service $R/etc/systemd/system/
echo '/usr/local/bin/smartos-session &' > $R/etc/xdg/openbox/autostart
printf 'smart ALL=(ALL) NOPASSWD: ALL\n' > $R/etc/sudoers.d/smart; chmod 440 $R/etc/sudoers.d/smart
mkdir -p $R/etc/NetworkManager/conf.d; printf '[main]\nauth-polkit=false\n' > $R/etc/NetworkManager/conf.d/smartos.conf
python3 - "$R" <<'PY'
import re,sys,os
p=sys.argv[1]+"/etc/xdg/openbox/rc.xml"
if os.path.exists(p):
    s=open(p).read()
    s=re.sub(r"<applications>.*?</applications>","",s,flags=re.S)
    s=s.replace("</openbox_config>","<applications><application class=\"XTerm\"><layer>above</layer><focus>yes</focus></application><application class=\"SmartApp\"><layer>above</layer><focus>yes</focus><decor>no</decor></application></applications>\n</openbox_config>")
    open(p,"w").write(s)
PY
mkdir -p $R/home/smart
cat > $R/home/smart/.Xresources <<'XR'
XTerm*background: #0b1020
XTerm*foreground: #e2e8f5
XTerm*cursorColor: #22d3ee
XTerm*faceName: DejaVu Sans Mono
XTerm*scrollBar: false
XTerm*saveLines: 5000
XTerm*selectToClipboard: true
XR
mkdir -p $R/etc/X11/xorg.conf.d
cat > $R/etc/X11/xorg.conf.d/40-smartos-input.conf <<'XC'
Section "InputClass"
    Identifier "smartos touchpad"
    MatchIsTouchpad "on"
    Driver "libinput"
    Option "Tapping" "on"
    Option "ClickMethod" "buttonareas"
    Option "DisableWhileTyping" "on"
    Option "MiddleEmulation" "off"
EndSection
XC
cat > $R/usr/local/bin/smartos-zram <<'ZR'
#!/bin/sh
modprobe zram num_devices=1 2>/dev/null || exit 0
[ -e /sys/block/zram0/disksize ] || exit 0
echo zstd > /sys/block/zram0/comp_algorithm 2>/dev/null || echo lzo > /sys/block/zram0/comp_algorithm 2>/dev/null
echo $(( $(awk '/MemTotal/{print $2}' /proc/meminfo) * 1024 )) > /sys/block/zram0/disksize
mkswap /dev/zram0 >/dev/null && swapon -p 100 /dev/zram0
ZR
chmod 755 $R/usr/local/bin/smartos-zram
printf '[Unit]\nDescription=zram swap\n[Service]\nType=oneshot\nExecStart=/usr/local/bin/smartos-zram\nRemainAfterExit=yes\n[Install]\nWantedBy=multi-user.target\n' > $R/etc/systemd/system/smartos-zram.service
echo smartos > $R/etc/hostname; : > $R/etc/fstab
printf 'NAME="Smart OS"\nPRETTY_NAME="Smart OS"\nID=smartos\nID_LIKE=debian\nVERSION_ID=1.0\nKERNEL_BRAND="Dios Kernel 1.1.1"\n' > $R/etc/os-release
chroot $R /bin/bash -c '
useradd -m -s /bin/bash -G audio,video,input,netdev,sudo smart; passwd -d root >/dev/null; passwd -d smart >/dev/null
echo "xrdb -merge ~/.Xresources; exec openbox-session" > /home/smart/.xinitrc
echo "[ -z \"\$DISPLAY\" ] && [ \"\$(tty)\" = /dev/tty1 ] && { sudo -n plymouth quit 2>/dev/null; sleep 1; exec startx; }" > /home/smart/.bash_profile
chown smart:smart /home/smart; chown smart:smart /home/smart/.xinitrc /home/smart/.bash_profile /home/smart/.Xresources
systemctl enable NetworkManager smartos-debug.service smartos-zram.service
systemctl mask apt-daily.timer apt-daily-upgrade.timer systemd-networkd-wait-online.service NetworkManager-wait-online.service
systemctl set-default multi-user.target
apt-get clean'
umount -l $R/proc $R/dev $R/sys 2>/dev/null || true
rm -rf $R/var/lib/apt/lists/* $R/usr/share/doc/* $R/usr/share/man/* $R/usr/share/info/* $R/var/cache/apt/* $R/tmp/*
mksquashfs "$R" out/smartos.sfs -comp xz -Xbcj x86 -b 256K -noappend -quiet
ls -lh out/smartos.sfs; du -sh "$R"

#!/bin/bash
# Apna Linux kernel compile: kernel.org source + Alpine lts config (known-good), zaroori cheezein built-in
set -euo pipefail
OUT="$(pwd)/out"; mkdir -p "$OUT" work; cd work
curl -fsSL https://raw.githubusercontent.com/alpinelinux/aports/master/main/linux-lts/lts.x86_64.config -o lts.config
V="$(curl -fsSL https://raw.githubusercontent.com/alpinelinux/aports/master/main/linux-lts/APKBUILD | grep -m1 '^pkgver=' | cut -d= -f2)"; echo "Alpine lts version: $V"
MM="${V%.*}"
if ! curl -fsSL "https://cdn.kernel.org/pub/linux/kernel/v${V%%.*}.x/linux-$V.tar.xz" -o k.tar.xz; then
  V="$(curl -fsSL https://www.kernel.org/releases.json | python3 -c "import json,sys;r=json.load(sys.stdin)['releases'];print([x['version'] for x in r if x['version'].startswith('$MM.')][0])")"
  echo "Fallback version $V"; curl -fsSL "https://cdn.kernel.org/pub/linux/kernel/v${V%%.*}.x/linux-$V.tar.xz" -o k.tar.xz
fi
tar xf k.tar.xz; cd "linux-$V"
cp ../lts.config .config
C=scripts/config
# Boot ke liye built-in (modules nahi, initramfs chhota rahe)
for o in DEVTMPFS DEVTMPFS_MOUNT TMPFS BLK_DEV_INITRD RD_GZIP BINFMT_SCRIPT PROC_FS SYSFS \
  ISO9660_FS JOLIET ZISOFS UDF_FS SQUASHFS SQUASHFS_FILE_DIRECT SQUASHFS_DECOMP_MULTI SQUASHFS_XZ SQUASHFS_ZSTD \
  OVERLAY_FS BLK_DEV_LOOP BLK_DEV_SR SCSI SCSI_SCAN_ASYNC BLK_DEV_SD ATA SATA_AHCI ATA_PIIX ATA_GENERIC ATA_BMDMA \
  BLK_DEV_NVME NVME_CORE USB USB_SUPPORT USB_XHCI_HCD USB_XHCI_PCI USB_EHCI_HCD USB_EHCI_PCI USB_OHCI_HCD USB_OHCI_PCI USB_UHCI_HCD USB_STORAGE \
  VIRTIO VIRTIO_PCI VIRTIO_BLK SCSI_VIRTIO VIRTIO_NET \
  EFI EFI_STUB FB_EFI SYSFB_SIMPLEFB DRM_SIMPLEDRM VFAT_FS FAT_FS NLS_CODEPAGE_437 NLS_ISO8859_1 NLS_UTF8 \
  EXT4_FS INPUT_EVDEV HID_GENERIC USB_HID HID_MULTITOUCH; do $C -e $o; done
$C -d MODULE_SIG -d MODULE_SIG_ALL -d MODULE_SIG_FORCE -d SYSTEM_TRUSTED_KEYRING -d SYSTEM_REVOCATION_LIST \
   --set-str SYSTEM_TRUSTED_KEYS "" --set-str SYSTEM_REVOCATION_KEYS "" --set-str MODULE_SIG_KEY "" \
   -d DEBUG_INFO -d DEBUG_INFO_BTF -d DEBUG_INFO_DWARF_TOOLCHAIN_DEFAULT -e DEBUG_INFO_NONE \
   -d MODULE_COMPRESS_ZSTD -d MODULE_COMPRESS_XZ -d MODULE_COMPRESS_GZIP -d MODULE_COMPRESS \
   --set-str LOCALVERSION "-smartos" -d LOCALVERSION_AUTO
make olddefconfig
for o in ISO9660_FS SQUASHFS OVERLAY_FS BLK_DEV_LOOP EFI_STUB; do grep -q "^CONFIG_$o=y" .config || { echo "FAIL: $o built-in nahi"; exit 1; }; done
make -j"$(nproc)" bzImage modules 2>&1 | tail -5
cp arch/x86/boot/bzImage "$OUT/vmlinuz"
make INSTALL_MOD_PATH="$OUT/modroot" modules_install 2>&1 | tail -2
rm -f "$OUT"/modroot/lib/modules/*/build "$OUT"/modroot/lib/modules/*/source
cp .config "$OUT/kernel.config"
echo "$V" > "$OUT/kver"; ls -lh "$OUT/vmlinuz"; du -sh "$OUT/modroot"

#!/usr/bin/env bash
ARCH=x86_64
# if aarch64 use ARCH=arm64 using uname -m
if [ "$(uname -m)" == "aarch64" ]; then
    ARCH=arm64
fi

echo "Generating GRUB2 EFI file for $ARCH"

grub2-mkimage -O ${ARCH}-efi -o grub${ARCH}.efi --config=grub.cfg -p /boot/grub efi_gop gfxterm font gfxmenu part_gpt part_msdos ext2 normal boot search search_label configfile echo loopback squash4 linux progress
mv -v grub${ARCH}.efi ../output/
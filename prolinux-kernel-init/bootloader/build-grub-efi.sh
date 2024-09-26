#!/usr/bin/env bash
ARCH=x86_64
# if aarch64 use ARCH=arm64 using uname -m
if [ "$(uname -m)" == "aarch64" ]; then
    ARCH=arm64
fi

echo "Generating GRUB2 EFI file for $ARCH"

grub2-mkstandalone -O ${ARCH}-efi -o grub${ARCH}.efi --fonts="unicode" --locales="en@quot" --themes="" --modules="efi_gop gfxterm font gfxmenu part_gpt part_msdos ext2 normal boot search search_label configfile echo ls loopback squash4 linux progress sleep read test" "boot/grub/grub.cfg=grub.cfg"

mv -v grub${ARCH}.efi ../output/
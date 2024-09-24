# ProLinux Kernel + Init (+Bootloader)
This component of the ProLinux build system builds the minimal ProLinux system image, which means:
- it builds the ProLinux kernel
- it builds the ProLinux initramfs
- it builds the GRUB EFI image
- creates a bootable image, which contains a partition table, with an ESP and empty root.

Note: the kernel and initramfs do not go into the system image at this stage! They are built into the ProLinux root_a/b.squish file, which is where GRUB reads them from.

## Kernel Defconfigs
ProLinux specifically requires the following additional configs:
- todo
### ARM64
The current ProLinux ARM 64-bit kernel builds on the upstream ARM64 defconfig, which (unlike x86) is actively maintained by Linux.

### x86_64
ProLinux mirrors the Arch defconfig to provide a reasonable base set of hardware support across the x86 ecosystem.
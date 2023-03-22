# ProLinux 2 - OS Build Infrastructure

ProLinux 2 is a GNU/Linux distribution with an immutable root (A/B SquashFS), writable overlay, Flatpak, and ProLinux management tools.


## Plasma Mobile Nightly
Currently the only edition available is the Plasma Mobile Nightly Edition, which is a developer/testing/fun focused OS, 
building the current state of Plasma Mobile from upstream git main/master using kdesrc-build. It is in some ways the successor to the original 
Alpine/postmarketOS based Plasma Mobile Nightly repository.

ProLinux 2 Plasma Mobile Nightly Edition piggy-backs on parts of postmarketOS (initramfs, kernel, pmbootstrap) to target devices.

### Build requirements
- node, npm
- cloud-utils


### QEMU (tablet-x64uefi testing)
```sh
qemu-system-x86_64 --enable-kvm -m 4G -smp 4 -device virtio-tablet-pci -device virtio-keyboard-pci -device virtio-vga-gl -display gtk,gl=on -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2-ovmf/x64/OVMF_CODE.fd -drive id=disk,file=output/tablet-x64uefi.img,if=none -device ahci,id=ahci -device ide-hd,drive=disk,bus=ahci.0 -netdev user,id=net0,hostfwd=tcp::8022-:22 -device virtio-net-pci,netdev=net0
```
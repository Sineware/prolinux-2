# ProLinux 2 - OS Build Infrastructure

ProLinux 2 is a GNU/Linux distribution with an immutable root (A/B SquashFS), writable overlay, Flatpak, and ProLinux management tools.

Info and Downloads: [https://sineware.ca/prolinux/

> Warning: this project is not ready for use! It is under development and probably broken at any given time.


## Plasma Mobile Nightly
Currently the only edition available is the Plasma Mobile Nightly Edition, which is a developer/testing/fun focused OS, 
building the current state of Plasma Mobile from upstream git main/master using kdesrc-build. It is in some ways the successor to the original 
Alpine/postmarketOS based Plasma Mobile Nightly repository.

ProLinux 2 Plasma Mobile Nightly Edition piggy-backs on parts of postmarketOS (initramfs, kernel, pmbootstrap) to target devices.

### Build requirements
- node, npm
- cloud-utils
- pmbootstrap
- arch-install-scripts
- abootimg
- simg2img
- pigz

Environment Configuration (.env):
```env
# Upon a successful kdesrc-build, a cache tar.gz is created which can be used
# instead of recompiling during a image build.
KDE_CACHE=false

# Path to a musl toolchain (ex. from musl.cc)
MUSL_TOOLCHAIN=

# defines what to build (mobile,dev is currently the only valid combo)
PROLINUX_VARIANT=mobile
PROLINUX_CHANNEL=dev

# Only used by update-deployer
PGUSER=
PGHOST=
PGPASSWORD=
PGDATABASE=
PGPORT=

PRIVATE_KEY=
```

Then run:
```sh
git submodule update --init
npm install
TARGET_DEVICE=tablet-x64uefi npm run build
TARGET_DEVICE=tablet-x64uefi npm run gen-image
```

This will (if successful) produce a image in "output/".

TARGET_DEVICE is a postmarketOS device string. Currently only "simple" devices are supported (ones that produce a flashable image, not android sparse images. i.e. pine64-pinephone).

Cross-compiling is not supported, arm64 targets must be built on arm64 devices. You need at least 64GB of free disk space.


### QEMU (tablet-x64uefi testing)
```sh
qemu-system-x86_64 --enable-kvm -m 4G -smp 4 -device virtio-tablet-pci -device virtio-keyboard-pci -device virtio-vga-gl -display gtk,gl=on -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2-ovmf/x64/OVMF_CODE.fd -drive id=disk,file=output/tablet-x64uefi.img,if=none -device ahci,id=ahci -device ide-hd,drive=disk,bus=ahci.0 -netdev user,id=net0,hostfwd=tcp::8022-:22 -device virtio-net-pci,netdev=net0
```

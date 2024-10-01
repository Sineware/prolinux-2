# ProLinux 2 - OS Build Infrastructure

ProLinux 2 is a GNU/Linux distribution with an immutable root (A/B SquashFS), writable overlay, Flatpak, and ProLinux management tools.

Info and Downloads: [https://sineware.ca/prolinux/](https://sineware.ca/prolinux/)

> Warning: this project is not ready for use! It is under development and probably broken at any given time.

ProLinux builds on the work of other open source projects,
- Arch Linux and [Arch Linux ARM](https://archlinuxarm.org/)
- [postmarketOS](https://postmarketos.org/)
- [DanctNIX](https://github.com/dreemurrs-embedded)
- and many more!

## Editions
- mobile
- embedded (aka Desktop)
- server

### Build requirements
(currently on x64 hosts, most of these requirements are built into a sdk docker image used for building)
- node, npm
- cloud-utils
- pmbootstrap
- arch-install-scripts
- abootimg
- simg2img (android-tools, debian: android-sdk-libsparse-utils)
- pigz
- util-linux (for Alpine)
- zsync,
- gcc,g++,make
- zstd
- rsync
- parted
- squashfs
- grub2, grub2-efi, grub2-efi-aa64-modules, grub2-tools, grub2-tools-extra
- python3 (aliased to python)
- *pip install gpt-image*

`/sbin:/usr/sbin` in PATH

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

# defines what device to target (sineware-x64 or sineware-arm64)
TARGET_DEVICE=sineware-x64

# Only used by update-deployer
PGUSER=
PGHOST=
PGPASSWORD=
PGDATABASE=
PGPORT=

PRIVATE_KEY=
```

Then (on x64 build hosts) run:
```sh
mkdir -pv output build
npm ci
./scripts/build_x64_docker.sh
```

or on arm64 build hosts:
```sh
mkdir -pv output build
npm ci
./scripts/build_arm64.sh
```

This will (if successful) produce a image in "output/".

<!--TARGET_DEVICE is a postmarketOS device string. Currently only "simple" devices are supported (ones that produce a flashable image, not android sparse images. i.e. pine64-pinephone).-->

Cross-compiling is not supported, arm64 targets must be built on arm64 devices. You need at least 64GB of free disk space.


### QEMU (sineware-x64 testing)
```sh
qemu-system-x86_64 --enable-kvm -m 4G -smp 4 -device virtio-tablet-pci -device virtio-keyboard-pci -device virtio-vga-gl -display gtk,gl=on -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2-ovmf/x64/OVMF_CODE.fd -drive id=disk,file=output/generic-x86_64.img,if=none -device ahci,id=ahci -device ide-hd,drive=disk,bus=ahci.0 -netdev user,id=net0,hostfwd=tcp::8022-:22 -device virtio-net-pci,netdev=net0
```
### QEMU (sineware-arm64 testing)
```sh
qemu-system-aarch64 
    -machine virt 
    -cpu host 
    -smp 2 
    -m 2048 
    -drive if=pflash,format=raw,file=/usr/share/edk2/aarch64/QEMU_EFI-pflash.raw,readonly=on 
    -serial stdio 
    -display gtk,gl=on 
    -device virtio-gpu-pci 
    -device qemu-xhci,id=usb,bus=pcie.0,addr=0x3 
    -device usb-kbd 
    -device usb-tablet 
    -device virtio-scsi-device,id=scsi 
    -drive file=sineware-arm64.img,format=raw,if=none,id=hd0 
    -device scsi-hd,drive=hd0 
    -enable-kvm
```

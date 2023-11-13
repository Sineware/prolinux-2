import fs from "fs"
import path from "path"
import exec from "../helpers/exec"
import { arch, BUILD_DIR, FILES_DIR, OUTPUT_DIR, ROOTFS_DIR, ACCEPTABLE_ANDROID_DEVICES, ACCEPTABLE_STANDARD_DEVICES, x64KernelDevices, PPKernelDevices } from "../helpers/consts";

export let loopDevice = "";

export function createAndMountPMOSImage(device: string, kernel: string): string {
    exec(`
        sudo rm -rf /tmp/postmarketOS-export/*
        yes "" | pmbootstrap -q init

        pmbootstrap config ui none
        pmbootstrap config device ${device}
        pmbootstrap config kernel ${kernel}
        pmbootstrap config extra_packages osk-sdl

        pmbootstrap -q -y zap -p

        printf "%s\n%s\n" 147147 147147 | pmbootstrap \
            -m http://dl-cdn.alpinelinux.org/alpine/ \
            -mp http://mirror.postmarketos.org/postmarketos/ \
            --details-to-stdout \
            install --no-sparse

        pmbootstrap export
    `);
    loopDevice = exec("sudo losetup -f", false).toString().trim();
    console.log(loopDevice);
    fs.writeFileSync(path.join(BUILD_DIR, "loop_device.txt"), loopDevice);

    let loopExtraArgs = "";
    let rootfs_image_sector_size = ACCEPTABLE_ANDROID_DEVICES.find((d) => d.name === device)?.rootfs_image_sector_size;
    if (rootfs_image_sector_size) {
        loopExtraArgs += "-b " + rootfs_image_sector_size;
    }
    exec(`
        set -e
        echo "Expanding pmos image..."
        sudo truncate -s 12G /tmp/postmarketOS-export/${device}.img
        #sudo qemu-img resize /tmp/postmarketOS-export/${device}.img 12G
        
        sudo losetup -f -P /tmp/postmarketOS-export/${device}.img ${loopExtraArgs}
        losetup -l
        sudo partprobe ${loopDevice}
        sudo udevadm trigger
        echo "Waiting for devices to settle..."
        sleep 5

        sudo growpart ${loopDevice} 2
        sudo e2fsck -fa ${loopDevice}p2
        sudo resize2fs ${loopDevice}p2

        ls -l /dev/disk/by-label
        if [ ! -e /dev/disk/by-label/pmOS_root ]; then
            echo "Error: /dev/disk/by-label/pmOS_root does not exist"
            sudo losetup -d ${loopDevice}
            exit 1
        fi
        mkdir -pv ${BUILD_DIR}/pmos_root_mnt
        mkdir -pv ${BUILD_DIR}/pmos_boot_mnt
        
        sudo mount ${loopDevice}p2 ${BUILD_DIR}/pmos_root_mnt
        sudo mount ${loopDevice}p1 ${BUILD_DIR}/pmos_boot_mnt

    `);
    
    return loopDevice;
}
export function unmountPMOSImage() {
    console.log("Cleanup (genPMOSImage)");
    exec(`
        sudo umount ${BUILD_DIR}/pmos_root_mnt
        sudo umount ${BUILD_DIR}/pmos_boot_mnt
    `);
}
export function pmosFinalCleanup() {
    exec(`sudo losetup -d ${loopDevice}`);
}

export function genPMOSImage(device: string) {
    exec(`
        echo "Adding modules for ${device} to device-support..."
        sudo mkdir -pv ${ROOTFS_DIR}/opt/device-support/${device}/modules
        sudo mkdir -pv ${ROOTFS_DIR}/opt/device-support/${device}/firmware/
        sudo rsync -a ${BUILD_DIR}/pmos_root_mnt/lib/modules/ ${ROOTFS_DIR}/opt/device-support/${device}/modules
        sudo rsync -a ${BUILD_DIR}/pmos_root_mnt/lib/firmware/  ${ROOTFS_DIR}/opt/device-support/${device}/firmware
    `);

    // Find out the kernel folder name
    let kernelVer = fs.readdirSync(`${BUILD_DIR}/pmos_root_mnt/lib/modules`)[0];

    // is squashfs builtin
    let squash_builtin = ACCEPTABLE_ANDROID_DEVICES.find((d) => d.name === device)?.squash_builtin;

    // is zstd initramfs
    let uses_zstd_initramfs = ACCEPTABLE_ANDROID_DEVICES.find((d) => d.name === device)?.uses_zstd_initramfs;

    // extract initramfs
    exec(`
        sudo mkdir -pv ${BUILD_DIR}/initramfs-work
        sudo rm -rf ${BUILD_DIR}/initramfs-work/*
        cd ${BUILD_DIR}/
        
        
        ${uses_zstd_initramfs ? `sudo cp ${BUILD_DIR}/pmos_boot_mnt/initramfs ${BUILD_DIR}/pmos_initramfs.zst && sudo rm ${BUILD_DIR}/pmos_initramfs && sudo zstd --rm -d ${BUILD_DIR}/pmos_initramfs.zst` : `sudo cp ${BUILD_DIR}/pmos_boot_mnt/initramfs ${BUILD_DIR}/pmos_initramfs.gz && sudo gunzip ${BUILD_DIR}/pmos_initramfs.gz -f`}
        cd initramfs-work
        sudo cpio --extract --make-directories --format=newc --no-absolute-filenames < ${BUILD_DIR}/pmos_initramfs
        sudo cp -v ${BUILD_DIR}/kexec-tools/build/sbin/kexec ${BUILD_DIR}/initramfs-work/sbin/kexec
        sudo mkdir -pv ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/squashfs
        sudo mkdir -pv ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/overlayfs
        ${squash_builtin ? "" :  `sudo cp -v ${BUILD_DIR}/pmos_root_mnt/lib/modules/${kernelVer}/kernel/fs/squashfs/squashfs.ko* ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/squashfs/`}
        sudo cp -v ${BUILD_DIR}/pmos_root_mnt/lib/modules/${kernelVer}/kernel/fs/overlayfs/overlay.ko* ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/overlayfs/
        sudo cp -v ${FILES_DIR}/initramfs/pmos-logo-text.svg ${BUILD_DIR}/initramfs-work/usr/share/pbsplash/
    `);

    // Initramfs init
    let originalInit = fs.readFileSync(path.join(BUILD_DIR, "/initramfs-work/init")).toString().split("\n");
    let prolinuxInit = fs.readFileSync(path.join(FILES_DIR, "/initramfs/init")).toString().split("\n");;
    originalInit.splice(originalInit.indexOf("# Switch root"), 0, ...prolinuxInit);
    originalInit.splice(originalInit.indexOf(`exec switch_root /sysroot "$init"`), 1, ...[
        `exec switch_root /sysroot/oroot "$init"`
    ]);
    originalInit.splice(originalInit.indexOf(`#!/bin/sh`), 1, ...[
        `#!/bin/busybox sh`
    ]);
    fs.writeFileSync(path.join(BUILD_DIR, "/new-init"), originalInit.join("\n"));


    let customKernelCommands = '';
    if(x64KernelDevices.includes(device)) {
        customKernelCommands = `echo "Copying custom compiled kernel for x64"
        sudo cp -v ${BUILD_DIR}/kernel/vmlinuz ${BUILD_DIR}/pmos_boot_mnt/vmlinuz-edge
        sudo rsync -a ${BUILD_DIR}/kernel/modroot/lib/modules/ ${ROOTFS_DIR}/opt/device-support/${device}/modules`
    } else if(PPKernelDevices.includes(device)) {
        customKernelCommands = `echo "Copying custom compiled kernel for PinePhone"
        sudo cp -v ${BUILD_DIR}/pp-kernel/vmlinuz ${BUILD_DIR}/pmos_boot_mnt/vmlinuz
        sudo cp -vrf ${BUILD_DIR}/pp-kernel/dtbs/* ${BUILD_DIR}/pmos_boot_mnt/dtbs/
        sudo rsync -a ${BUILD_DIR}/pp-kernel/modroot/lib/modules/ ${ROOTFS_DIR}/opt/device-support/${device}/modules
        sudo cp -r ${BUILD_DIR}/pp-kernel/modroot/lib/modules/* ${BUILD_DIR}/initramfs-work/lib/modules/
        `
    }
    
    // bundle it
    exec(`
        sudo cp -v ${BUILD_DIR}/new-init ${BUILD_DIR}/initramfs-work/init
        sudo chmod +x ${BUILD_DIR}/initramfs-work/init
        ${(arch === "x64") ? `sudo cp -r ${BUILD_DIR}/kernel/modroot/lib/modules/* ${BUILD_DIR}/initramfs-work/lib/modules/` : ""}
        ${customKernelCommands}

        # TODO: temp testing
        # copy all firmware to initramfs
        mkdir -pv ${BUILD_DIR}/initramfs-work/lib/firmware/
        sudo cp -r ${BUILD_DIR}/pmos_root_mnt/lib/firmware/* ${BUILD_DIR}/initramfs-work/lib/firmware/

        
        cd ${BUILD_DIR}/initramfs-work/
        find . -print0 | cpio --null --create --verbose --format=newc | gzip --best > ${BUILD_DIR}/new-initramfs
        sudo cp -v ${BUILD_DIR}/new-initramfs ${BUILD_DIR}/pmos_boot_mnt/initramfs

        mkdir -pv ${OUTPUT_DIR}/${device}
        
        echo "Adding kernel+initramfs to /opt/device-support/-"
        sudo mkdir -pv ${ROOTFS_DIR}/opt/device-support/${device}
        sudo cp -rv ${BUILD_DIR}/pmos_boot_mnt/* ${BUILD_DIR}/rootfs/opt/device-support/${device}/
        sudo cp -rv ${BUILD_DIR}/pmos_boot_mnt/* ${OUTPUT_DIR}/${device}/
    `)
    let should_gunzip_vmlinuz_android = ACCEPTABLE_ANDROID_DEVICES.find((d) => d.name === device)?.should_gunzip_vmlinuz;
    let should_gunzip_vmlinuz_standard = ACCEPTABLE_STANDARD_DEVICES.find((d) => d.name === device)?.should_gunzip_vmlinuz;
    if(should_gunzip_vmlinuz_android || should_gunzip_vmlinuz_standard) {
        exec(`
            sudo mv -v ${BUILD_DIR}/rootfs/opt/device-support/${device}/vmlinuz ${BUILD_DIR}/rootfs/opt/device-support/${device}/vmlinuz.gz
            sudo gunzip -v ${BUILD_DIR}/rootfs/opt/device-support/${device}/vmlinuz.gz
        `);
    }

    unmountPMOSImage();
}

import fs from "fs"
import path from "path"
import exec from "../helpers/exec"
import { BUILD_DIR, FILES_DIR, OUTPUT_DIR } from "../helpers/consts";

export let loopDevice = "";

export function createAndMountPMOSImage(device: string): string {
    let kernel = "";
    if(device === "tablet-x64uefi") {
        kernel = "edge";
    }
    exec(`
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
            install

        pmbootstrap export
    `);
    loopDevice = exec("sudo losetup -f", false).toString().trim();
    console.log(loopDevice);
    exec(`
        set -e
        echo "Expanding pmos image..."
        sudo truncate -s 5G /tmp/postmarketOS-export/${device}.img
        
        sudo losetup -f -P /tmp/postmarketOS-export/${device}.img
        losetup -l
        sudo partprobe ${loopDevice}
        sudo udevadm trigger
        echo "Waiting for devices to settle..."
        sleep 5

        sudo growpart ${loopDevice} 2
        sudo e2fsck -f ${loopDevice}p2
        sudo resize2fs ${loopDevice}p2

        ls -l /dev/disk/by-label
        if [ ! -e /dev/disk/by-label/pmOS_root ]; then
            echo "Error: /dev/disk/by-label/pmOS_root does not exist"
            sudo losetup -d ${loopDevice}
            exit 1
        fi
        mkdir -pv ${BUILD_DIR}/pmos_root_mnt
        mkdir -pv ${BUILD_DIR}/pmos_boot_mnt

        sudo mount /dev/disk/by-label/pmOS_root ${BUILD_DIR}/pmos_root_mnt
        sudo mount /dev/disk/by-label/pmOS_boot ${BUILD_DIR}/pmos_boot_mnt
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
    createAndMountPMOSImage(device);

    exec(`
        sudo mkdir -pv ${BUILD_DIR}/rootfs/lib/modules/ ${BUILD_DIR}/rootfs/lib/firmware/
        sudo rsync -a ${BUILD_DIR}/pmos_root_mnt/lib/modules/ ${BUILD_DIR}/rootfs/lib/modules
        sudo rsync -a ${BUILD_DIR}/pmos_root_mnt/lib/firmware/ ${BUILD_DIR}/rootfs/lib/firmware
    `);

    // Add kexec to initramfs
    exec(`sudo cp -v {BUILD_DIR}/kexec-tools/build/sbin/kexec ${BUILD_DIR}/pmos_root_mnt/sbin/kexec`);

    // Find out the kernel folder name
    let kernelVer = fs.readdirSync(`${BUILD_DIR}/pmos_root_mnt/lib/modules`)[0];

    // extract initramfs
    exec(`
        sudo mkdir -pv ${BUILD_DIR}/initramfs-work
        sudo rm -rf ${BUILD_DIR}/initramfs-work/*
        cd ${BUILD_DIR}/
        sudo cp ${BUILD_DIR}/pmos_boot_mnt/initramfs ${BUILD_DIR}/pmos_initramfs.gz
        sudo gunzip ${BUILD_DIR}/pmos_initramfs.gz -f
        cd initramfs-work
        sudo cpio --extract --make-directories --format=newc --no-absolute-filenames < ${BUILD_DIR}/pmos_initramfs

        sudo mkdir -pv ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/squashfs
        sudo mkdir -pv ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/overlayfs
        sudo cp -v ${BUILD_DIR}/pmos_root_mnt/lib/modules/${kernelVer}/kernel/fs/squashfs/squashfs.ko.* ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/squashfs/
        sudo cp -v ${BUILD_DIR}/pmos_root_mnt/lib/modules/${kernelVer}/kernel/fs/overlayfs/overlay.ko.* ${BUILD_DIR}/initramfs-work/lib/modules/${kernelVer}/kernel/fs/overlayfs/
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

    // bundle it
    exec(`
        sudo cp -v ${BUILD_DIR}/new-init ${BUILD_DIR}/initramfs-work/init
        sudo chmod +x ${BUILD_DIR}/initramfs-work/init
        cd ${BUILD_DIR}/initramfs-work/
        find . -print0 | cpio --null --create --verbose --format=newc | gzip --best > ${BUILD_DIR}/new-initramfs
        sudo cp -v ${BUILD_DIR}/new-initramfs ${BUILD_DIR}/pmos_boot_mnt/initramfs

        mkdir -pv ${OUTPUT_DIR}/${device}
        sudo cp -v ${BUILD_DIR}/pmos_boot_mnt/initramfs ${OUTPUT_DIR}/${device}/initramfs
        sudo cp -v ${BUILD_DIR}/pmos_boot_mnt/initramfs-extra ${OUTPUT_DIR}/${device}/initramfs-extra
        sudo cp -v ${BUILD_DIR}/pmos_boot_mnt/vmlinuz ${OUTPUT_DIR}/${device}/vmlinuz
        echo "Adding kernel+initramfs to /opt/device-support/-"
        sudo cp -v ${BUILD_DIR}/pmos_boot_mnt/vmlinuz ${BUILD_DIR}/rootfs/opt/device-support/${device}/vmlinuz
        sudo cp -v ${BUILD_DIR}/pmos_boot_mnt/initramfs ${BUILD_DIR}/rootfs/opt/device-support/${device}/initramfs
        
    `)

    unmountPMOSImage();
}
import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import path from "path";
import { OUTPUT_DIR, TARGET_DEVICE, BUILD_DIR, FILES_DIR, ACCEPTABLE_ANDROID_DEVICES, KERNEL_INIT_DIR, arch } from '../../src/helpers/consts';
import exec from "../../src/helpers/exec";

// this version of the image-gen script is modified from the pmos version for generic sineware images
// using the prolinux-kernel-init image.

let PROLINUX_VARIANT = process.env.PROLINUX_VARIANT;
let PROLINUX_CHANNEL = process.env.PROLINUX_CHANNEL;

let loopDevice = "";

const mountPMOSImage = (targetDevice: string) => {
    loopDevice = exec("sudo losetup -f", false).toString().trim();
    fs.writeFileSync(path.join(BUILD_DIR, "loop_device.txt"), loopDevice);

    console.log("image-gen loopDevice: " + loopDevice);

    let loopExtraArgs = "";
    let rootfs_image_sector_size = ACCEPTABLE_ANDROID_DEVICES.find((d) => d.name === targetDevice)?.rootfs_image_sector_size;
    if (rootfs_image_sector_size) {
        loopExtraArgs += "-b " + rootfs_image_sector_size;
    }

    exec(`
        cp -rv ${KERNEL_INIT_DIR}/output/disk-image.img ${BUILD_DIR}/img-staging/${targetDevice}.img
        sudo losetup -f -P ${BUILD_DIR}/img-staging/${targetDevice}.img ${loopExtraArgs}
        losetup -l
        sudo partprobe ${loopDevice}
        sudo udevadm trigger
        echo "Waiting for devices to settle..."
        sleep 5

        echo "Growing raw image partitions..."
        sudo growpart ${loopDevice} 2 || true

        ls -al /dev/disk/by-partlabel

        echo "Creating filesystems..."
        sudo mkfs.vfat -n plfs_boot /dev/disk/by-partlabel/prolinux_boot
        sudo mkfs.ext4 -L plfs_data /dev/disk/by-partlabel/prolinux_data
        sync
        sleep 1
    `);
};

const buildTargetStandardPMOSDeviceImage = (targetDevice: string) => {
    console.log(`Building ${targetDevice} image`);

    let EFI_ARCH;
    if(arch === "x64") {
        EFI_ARCH = "X64";
    } else if (arch === "arm64") {
        EFI_ARCH = "AA64";
    } else {
        console.log("Unknown arch: " + arch);
        process.exit(1);
    }

    // Format and place files into rootfs
    exec(`
        sudo mount /dev/disk/by-partlabel/prolinux_data ${BUILD_DIR}/pmos_root_mnt
        sudo mount /dev/disk/by-partlabel/prolinux_boot ${BUILD_DIR}/pmos_boot_mnt

        sudo mkdir -pv ${BUILD_DIR}/pmos_boot_mnt/EFI/BOOT
        sudo cp -v ${KERNEL_INIT_DIR}/output/grub*.efi ${BUILD_DIR}/pmos_boot_mnt/EFI/BOOT/BOOT${EFI_ARCH}.EFI

        sudo rsync -ah --progress ${OUTPUT_DIR}/prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.squish ${BUILD_DIR}/pmos_root_mnt/prolinux_a.squish
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/squishroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/persistroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/workdir
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/oroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/data
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/data/home
        sudo cp -r ${FILES_DIR}/layout/home/* ${BUILD_DIR}/pmos_root_mnt/data/home/
        sudo chown -R 1000:1000 ${BUILD_DIR}/pmos_root_mnt/data/home/user
        sudo cp -v ${FILES_DIR}/prolinux.toml ${BUILD_DIR}/pmos_root_mnt/data/prolinux.toml
        sudo cp -v ${FILES_DIR}/generic-grub.cfg ${BUILD_DIR}/pmos_root_mnt/grub.cfg


        sudo umount /dev/disk/by-partlabel/prolinux_data
        sudo umount /dev/disk/by-partlabel/prolinux_boot

        sync
        sudo ./scripts/unmount.sh || true
        sleep 4
    `);

    exec(`
        sudo cp -v  ${BUILD_DIR}/img-staging/${targetDevice}.img ${OUTPUT_DIR}
    `);

};
export function main() {
    exec("sudo ./scripts/unmount.sh || true");
    if (!TARGET_DEVICE) {
        console.log("TARGET_DEVICE is not set");
        process.exit(1);
    }    

    let device;
    let kernel;
    [device, kernel] = TARGET_DEVICE.split(":");

    mountPMOSImage(device);
    buildTargetStandardPMOSDeviceImage(device);
    exec(`sudo losetup -d ${loopDevice} || true`);
}
main();

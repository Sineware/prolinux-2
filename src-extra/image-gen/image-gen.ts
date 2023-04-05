import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import path from "path";
import { OUTPUT_DIR, TARGET_DEVICE, BUILD_DIR, FILES_DIR } from '../../src/helpers/consts';
import exec from "../../src/helpers/exec";
import { createAndMountPMOSImage, unmountPMOSImage, pmosFinalCleanup, } from '../../src/pmbootstrap';

let PROLINUX_VARIANT = process.env.PROLINUX_VARIANT;
let PROLINUX_CHANNEL = process.env.PROLINUX_CHANNEL;

const buildTargetStandardPMOSDeviceImage = (targetDevice: string) => {
    console.log(`Building ${targetDevice} image`);
    //exec(`sudo cp -v ${BUILD_DIR}/new-initramfs ${BUILD_DIR}/pmos_boot_mnt/initramfs`);
    exec(`sudo cp -v ${OUTPUT_DIR}/${targetDevice}/* ${BUILD_DIR}/pmos_boot_mnt/`);
    //exec(`bash`);
    unmountPMOSImage();
    
    // Format and place files into rootfs
    exec(`
        sudo mkfs.ext4 /dev/disk/by-label/pmOS_root -F -L pmOS_root
        sudo mount /dev/disk/by-label/pmOS_root ${BUILD_DIR}/pmos_root_mnt
        sudo rsync -ah --progress ${OUTPUT_DIR}/prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.squish ${BUILD_DIR}/pmos_root_mnt/prolinux_a.squish
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/squishroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/persistroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/workdir
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/oroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/data
        sudo cp -v ${FILES_DIR}/prolinux.toml ${BUILD_DIR}/pmos_root_mnt/data/prolinux.toml

        # pmos init checks this to see if root was mounted
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/usr
        sudo umount /dev/disk/by-label/pmOS_root
        sync
    `);

    exec(`
        sudo cp -v /tmp/postmarketOS-export/*.img ${OUTPUT_DIR}
    `);
};
export function main() {
    if (!TARGET_DEVICE) {
        console.log("TARGET_DEVICE is not set");
        process.exit(1);
    }
    let targetDeviceFolder = path.join(OUTPUT_DIR, TARGET_DEVICE);
    if (!fs.existsSync(targetDeviceFolder)) {
        console.log(`${targetDeviceFolder} does not exist`);
        process.exit(1);
    }
    createAndMountPMOSImage(TARGET_DEVICE);
    buildTargetStandardPMOSDeviceImage(TARGET_DEVICE);
    pmosFinalCleanup(); // losetup -d
}
main();
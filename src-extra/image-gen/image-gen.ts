import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import path from "path";
import { OUTPUT_DIR, TARGET_DEVICE, BUILD_DIR, FILES_DIR, ACCEPTABLE_ANDROID_DEVICES } from '../../src/helpers/consts';
import exec from "../../src/helpers/exec";

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
        sudo losetup -f -P ${BUILD_DIR}/img-staging/${targetDevice}.img ${loopExtraArgs}
        losetup -l
        sudo partprobe ${loopDevice}
        sudo udevadm trigger
        echo "Waiting for devices to settle..."
        sleep 5
    `);
};

const buildTargetStandardPMOSDeviceImage = (targetDevice: string) => {
    console.log(`Building ${targetDevice} image`);
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
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/data/home
        sudo cp -r ${FILES_DIR}/layout/home/* ${BUILD_DIR}/pmos_root_mnt/data/home/
        sudo chown -R 1000:1000 ${BUILD_DIR}/pmos_root_mnt/data/home/user
        sudo cp -v ${FILES_DIR}/prolinux.toml ${BUILD_DIR}/pmos_root_mnt/data/prolinux.toml

        # pmos init checks this to see if root was mounted
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/usr
        sudo umount /dev/disk/by-label/pmOS_root
        sync
        sudo ./scripts/unmount.sh || true
        sleep 4
    `);

    exec(`
        sudo cp -v  ${BUILD_DIR}/img-staging/${targetDevice}.img ${OUTPUT_DIR}
    `);

    let adevice = ACCEPTABLE_ANDROID_DEVICES.find((d) => d.name === targetDevice)
    if(adevice) {
            // Convert to Android sparse image
            exec(`
                sudo mv ${OUTPUT_DIR}/${targetDevice}.img ${OUTPUT_DIR}/${targetDevice}-raw.img
                sudo img2simg ${OUTPUT_DIR}/${targetDevice}-raw.img ${OUTPUT_DIR}/${targetDevice}.img ${adevice.rootfs_image_sector_size ?? ""}
                sudo rm -rf ${OUTPUT_DIR}/${targetDevice}-raw.img
            `);
            // Insert initramfs into boot.img
            // also blacklists nt36xxx during stage 1 to fix poco touchscreen issue
            exec(`pushd .
                cd ${OUTPUT_DIR}/${targetDevice}
                mkdir -pv work
                cd work
                sudo abootimg -x ../boot.img
                sudo sed -i "s/bootsize.*/bootsize = 0xff0000/g" bootimg.cfg
                sudo sed -i "s/cmdline.*/cmdline = console=tty0 PMOS_NO_OUTPUT_REDIRECT initcall_blacklist=nt36xxx initcall_blacklist=qcom-q6v5-mss/g" bootimg.cfg
                sudo abootimg --create boot.img -f bootimg.cfg -k zImage -r ../initramfs
                sudo mv boot.img ../boot.img
            popd`);
    }

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

    let targetDeviceFolder = path.join(OUTPUT_DIR, device);
    if (!fs.existsSync(targetDeviceFolder)) {
        console.log(`${targetDeviceFolder} does not exist`);
        process.exit(1);
    }
    mountPMOSImage(device);
    buildTargetStandardPMOSDeviceImage(device);
    exec(`sudo losetup -d ${loopDevice} || true`);
}
main();

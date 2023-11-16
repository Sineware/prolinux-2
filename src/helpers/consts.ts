import path from "path";
import exec from "./exec";
export const BUILD_DIR = path.join(process.cwd() + "/build");
export const ROOTFS_DIR = path.join(BUILD_DIR + "/rootfs");
export const OUTPUT_DIR = path.join(process.cwd(), "/output")
export const FILES_DIR = path.join(__dirname + "/../../distro-files");
export const arch = process.arch;
export const TARGET_DEVICE = process.env.TARGET_DEVICE;
export const ACCEPTABLE_STANDARD_DEVICES = [
    { 
        "name": "pine64-pinephone",
        "should_gunzip_vmlinuz": true
     },
    { 
        "name": "pine64-pinephonepro",
        "should_gunzip_vmlinuz": true
    },
    {
        "name": "pine64-pinebookpro",
        "should_gunzip_vmlinuz": true
    },
    { "name": "tablet-x64uefi",
        "should_gunzip_vmlinuz": false

     }
];
export const ACCEPTABLE_ANDROID_DEVICES = [
    {
        name: "xiaomi-beryllium",
        "rootfs_image_sector_size": 4096,
        "squash_builtin": true,
        "should_gunzip_vmlinuz": true,
        "uses_zstd_initramfs": true,
        "should_disable_kexec": true
    },
    {
        name: "oneplus-enchilada",
        "rootfs_image_sector_size": 4096,
        "squash_builtin": true,
        "should_gunzip_vmlinuz": true,
        "uses_zstd_initramfs": true,
        "should_disable_kexec": true
    },
];

export const x64KernelDevices = [
    "tablet-x64uefi"
]
export const PPKernelDevices = [
    "pine64-pinephone"
]
export const PPPKernelDevices = [
    "pine64-pinephonepro"
]
export const SDM845KernelDevices = [
    "xiaomi-beryllium",
    "oneplus-enchilada",
]

export const requiredKConfigLines = [
    `CONFIG_LOCALVERSION="-sineware-prolinux-2"`,
    `CONFIG_DEFAULT_HOSTNAME="prolinux-system"`
]

export const MUSL_TOOLCHAIN = process.env.MUSL_TOOLCHAIN;

export const X64_KERNEL = "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.5.3.tar.xz"; // https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.2.9.tar.xz 
export const MEGI_KERNEL = "https://codeberg.org/megi/linux/archive/orange-pi-6.6-20231103-1422.tar.gz";

//export const GIT_COMMIT = exec("git rev-parse HEAD", false).toString().trim() ?? "unknown";
export let PROLINUX_VARIANT = process.env.PROLINUX_VARIANT;
export let PROLINUX_CHANNEL = process.env.PROLINUX_CHANNEL;

export const NODEJS_PACKAGE = `https://nodejs.org/dist/v20.9.0/node-v20.9.0-linux-${arch}.tar.xz`;
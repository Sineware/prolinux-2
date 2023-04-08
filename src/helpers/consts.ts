import path from "path";
import exec from "./exec";
export const BUILD_DIR = path.join(process.cwd() + "/build");
export const ROOTFS_DIR = path.join(BUILD_DIR + "/rootfs");
export const OUTPUT_DIR = path.join(process.cwd(), "/output")
export const FILES_DIR = path.join(__dirname + "/../../distro-files");
export const arch = process.arch;
export const TARGET_DEVICE = process.env.TARGET_DEVICE;
export const ACCEPTABLE_STANDARD_DEVICES = [
    { "name": "pine64-pinephone" },
    { 
        "name": "pine64-pinephonepro",
        "should_gunzip_vmlinuz": true
    },
    { "name": "pine64-pinebookpro" },
    { "name": "tablet-x64uefi" }
];
export const ACCEPTABLE_ANDROID_DEVICES = [
    {
        name: "xiaomi-beryllium",
        "rootfs_image_sector_size": 4096,
        "squash_builtin": true,
        "should_gunzip_vmlinuz": true
    },
    {
        name: "oneplus-enchilada",
        "rootfs_image_sector_size": 4096,
        "squash_builtin": true,
        "should_gunzip_vmlinuz": true
    },
];
export const MUSL_TOOLCHAIN = process.env.MUSL_TOOLCHAIN;
export const X64_KERNEL = "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.2.9.tar.xz";
//export const GIT_COMMIT = exec("git rev-parse HEAD", false).toString().trim() ?? "unknown";
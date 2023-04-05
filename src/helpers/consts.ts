import path from "path";
export const BUILD_DIR = path.join(process.cwd() + "/build");
export const ROOTFS_DIR = path.join(BUILD_DIR + "/rootfs");
export const OUTPUT_DIR = path.join(process.cwd(), "/output")
export const FILES_DIR = path.join(__dirname + "/../../distro-files");
export const arch = process.arch;
export const TARGET_DEVICE = process.env.TARGET_DEVICE;
export const MUSL_TOOLCHAIN = process.env.MUSL_TOOLCHAIN;
export const X64_KERNEL = "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.2.9.tar.xz";
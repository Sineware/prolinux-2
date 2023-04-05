import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import path from "path";
import { OUTPUT_DIR, TARGET_DEVICE, BUILD_DIR, FILES_DIR, X64_KERNEL } from '../../src/helpers/consts';
import exec from "../../src/helpers/exec";

export function buildX64Kernel(device: string) {
    exec(`
        mkdir -pv ${BUILD_DIR}/kernel
        pushd .
            cd ${BUILD_DIR}/kernel
            wget ${X64_KERNEL} -O kernel.tar.gz
            tar -xvf kernel.tar.gz --strip-components=1

            cp -v ${__dirname + "/kconfigs/x64-config"} .config
            make -j$(nproc)

            sudo cp -v arch/x86_64/boot/bzImage vmlinuz
            mkdir -pv modroot && make modules_install INSTALL_MOD_PATH=modroot
        popd
    `);
}
buildX64Kernel(TARGET_DEVICE ?? process.exit(1));
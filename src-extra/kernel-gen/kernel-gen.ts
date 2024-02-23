import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import path from "path";
import { OUTPUT_DIR, TARGET_DEVICE, BUILD_DIR, FILES_DIR, X64_KERNEL, MEGI_KERNEL, x64KernelDevices, requiredKConfigLines, PPKernelDevices, PPPKernelDevices } from '../../src/helpers/consts';
import exec from "../../src/helpers/exec";

export function buildX64Kernel() {
    const kconfig = fs.readFileSync(__dirname + "/kconfigs/x64-config", "utf-8");
    for(const line of requiredKConfigLines) {
        if(!kconfig.includes(line)) {
            console.error(`Required kconfig line not found: ${line}`);
            process.exit(1);
        }
        console.log(`Verified KConfig Value: ${line}`);
    }


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

export function buildPPKernel() {
    exec(`
    mkdir -pv ${BUILD_DIR}/pp-kernel
    pushd .
        cd ${BUILD_DIR}/pp-kernel
        rm -rfv *
        wget ${MEGI_KERNEL} -O kernel.tar.gz
        tar -xvf kernel.tar.gz --strip-components=1    

        cp -v ${__dirname + "/kconfigs/pp-config"} .config
        make -j$(nproc)
        make -j$(nproc) Image dtbs modules

        sudo cp -v arch/arm64/boot/Image.gz vmlinuz
        mkdir -pv modroot && mkdir -pv dtbs 
        make modules_install dtbs_install INSTALL_MOD_PATH=modroot INSTALL_DTBS_PATH=dtbs INSTALL_MOD_STRIP=1
    popd
`);
}

export function buildPPPKernel() {
    exec(`
    mkdir -pv ${BUILD_DIR}/ppp-kernel
    pushd .
        cd ${BUILD_DIR}/ppp-kernel
        rm -rfv *
        wget ${MEGI_KERNEL} -O kernel.tar.gz
        tar -xvf kernel.tar.gz --strip-components=1    

        cp -v ${__dirname + "/kconfigs/ppp-config"} .config
        make -j$(nproc)
        make -j$(nproc) Image dtbs modules

        sudo cp -v arch/arm64/boot/Image.gz vmlinuz
        mkdir -pv modroot && mkdir -pv dtbs 
        make modules_install dtbs_install INSTALL_MOD_PATH=modroot INSTALL_DTBS_PATH=dtbs INSTALL_MOD_STRIP=1
    popd
`);
}

function main() {
    

    if(!TARGET_DEVICE) {
        console.error("No target device specified");
        process.exit(1);
    }

    if(x64KernelDevices.includes(TARGET_DEVICE)) buildX64Kernel();
    else if(PPKernelDevices.includes(TARGET_DEVICE)) buildPPKernel();
    else if(PPPKernelDevices.includes(TARGET_DEVICE)) buildPPPKernel();
    else {
        console.error("Invalid target device");
        process.exit(1);
    }
}
main();
//buildX64Kernel(TARGET_DEVICE ?? process.exit(1));
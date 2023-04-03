import exec from "../helpers/exec"
import { BUILD_DIR, MUSL_TOOLCHAIN } from "../helpers/consts";
export function compileKexecTools() {
    const url = "https://mirrors.edge.kernel.org/pub/linux/utils/kernel/kexec/kexec-tools-2.0.26.tar.xz";
    exec(`wget ${url} -O ${BUILD_DIR}/kexec-tools.tar.gz`);
    exec(`mkdir -p ${BUILD_DIR}/kexec-tools && rm -rf ${BUILD_DIR}/kexec-tools/*`);
    exec(`tar -xvf ${BUILD_DIR}/kexec-tools.tar.gz -C ${BUILD_DIR}/kexec-tools --strip-components=1`);
    exec(`pushd .
        cd ${BUILD_DIR}/kexec-tools
        export CC=${MUSL_TOOLCHAIN}/bin/aarch64-linux-musl-gcc
        export CXX=${MUSL_TOOLCHAIN}/bin/aarch64-linux-musl-g++ 
        ./configure --host=aarch64-linux-musl
        make -j$(nproc)
        
        unset CC
        unset CXX
    popd`);
}

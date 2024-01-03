import exec from "../helpers/exec"
import { BUILD_DIR, ROOTFS_DIR } from "../helpers/consts";
// libhybris is a compatibility layer for Android drivers
export function compileHybrisSupportPackages() {
    console.log("Compiling hybris support packages...");
    const libhyrbis_url = "https://github.com/droidian/libhybris.git";
    const android_headers_url = "http://staging.repo.droidian.org/pool/main/a/android-headers-30/android-headers-30_9.0~1%2Bgit20211206200545.9b0c992.bookworm.tar.xz";
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e

        mkdir -pv /tmp/libhybris-build
        cd /tmp/libhybris-build

        git clone ${libhyrbis_url}
        wget ${android_headers_url} -O android-headers.tar.xz
        tar -xvf android-headers.tar.xz

        cd libhybris/hybris
            ./autogen.sh --enable-wayland \
                --with-android-headers=/tmp/libhybris-build/src \
                --enable-property-cache \
                --enable-experimental \
                --enable-glvnd \
                --enable-clicd \
                --enable-arch=arm64 \
                --enable-mali-quirks \
                --enable-adreno-quirks \
                --prefix=/usr
            make -j$(nproc)
            make -j1 install
        cd ..
        

        cd ..
        # clean up
        rm -rf /tmp/libhybris-build

EOF`);
}

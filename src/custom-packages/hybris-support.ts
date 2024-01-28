import exec from "../helpers/exec"
import { BUILD_DIR, ROOTFS_DIR } from "../helpers/consts";
// called in src/os-variants/mobile-halium/mobile-halium-dev.ts

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

export function compileHaliumSupportPackages() {
    console.log("Adding halium lxc-android to rootfs...");
    const lxc_android_url = "https://github.com/droidian/lxc-android.git";
    const android_rootfs_url = "https://ci.ubports.com/job/UBportsCommunityPortsJenkinsCI/job/ubports%252Fporting%252Fcommunity-ports%252Fjenkins-ci%252Fgeneric_arm64/job/halium-13.0/lastSuccessfulBuild/artifact/halium_halium_arm64.tar.xz";
    // lxc_android_url is a git repo with /etc, /usr, etc that should be merged in to the rootfs using rsync
    exec(`git clone ${lxc_android_url} ${BUILD_DIR}/lxc-android`);
    exec(`sudo rsync -av ${BUILD_DIR}/lxc-android/etc/ ${ROOTFS_DIR}/etc/`);
    exec(`sudo rsync -av ${BUILD_DIR}/lxc-android/usr/ ${ROOTFS_DIR}/usr/`);
    exec(`sudo rsync -av ${BUILD_DIR}/lxc-android/var/ ${ROOTFS_DIR}/var/`);
    exec(`sudo rsync -av ${BUILD_DIR}/lxc-android/lib/ ${ROOTFS_DIR}/lib/`);

    exec(`sudo rm -rf ${BUILD_DIR}/lxc-android`);

    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        cd /tmp
        wget ${android_rootfs_url} -O android-rootfs.tar.xz
        tar -xvf android-rootfs.tar.xz
        mkdir -pv /var/lib/lxc/android/rootfs 
        cp -v /tmp/system/var/lib/lxc/android/android-rootfs.img /var/lib/lxc/android/
        rm -rv /tmp/system /tmp/partitions /tmp/android-rootfs.tar.xz 
EOF`);
}

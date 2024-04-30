import exec from "../helpers/exec"
import { BUILD_DIR, MUSL_TOOLCHAIN, ROOTFS_DIR, arch } from "../helpers/consts";

/* Installs packages to support Qualcomm Snapdrgaon SDM845 based devices */
export function compileSDM845SupportPackages() {
    if(arch != "arm64") {
        console.log("SDM845 support packages are only available for arm64");
        return;
    }
    // exec arch-chroot
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e

        mkdir -pv /tmp/sdm845-support
        cd /tmp/sdm845-support/

        # Script to configure device wlan and bt mac addresses from /proc/cmdline (set from android bootloader)
        git clone https://gitlab.com/postmarketOS/bootmac.git
        cd bootmac
        install -Dm644 bootmac.rules /usr/lib/udev/rules.d/90-bootmac.rules
        install -Dm755 bootmac /usr/bin/bootmac
        cd ..

        git clone https://github.com/linux-msm/qmic.git
        cd qmic
        make -j$(nproc) prefix=/usr
        make -j$(nproc) prefix=/usr install
        cd ..

        git clone https://github.com/linux-msm/qrtr.git
        cd qrtr
        mkdir build
        meson setup --prefix=/usr --errorlogs --werror . build
        ninja -C build
        ninja -C build install
        cd ..

        git clone https://github.com/andersson/rmtfs.git
        cd rmtfs
        make -j$(nproc) prefix=/usr
        make -j$(nproc) prefix=/usr install
        echo 'SUBSYSTEM=="uio", ATTR{name}=="rmtfs", SYMLINK+="qcom_rmtfs_uio1"' > /usr/lib/udev/rules.d/65-rmtfs.rules
        cd ..

        git clone https://github.com/linux-msm/pd-mapper.git
        cd pd-mapper
        make -j$(nproc) prefix=/usr
        make -j$(nproc) prefix=/usr install
        cd ..

        git clone https://github.com/linux-msm/tqftpserv.git
        cd tqftpserv
        mkdir build
        meson setup --prefix=/usr --errorlogs --werror . build
        ninja -C build
        ninja -C build install
        cd ..

        # ALSA UCM for sound support
        git clone https://gitlab.com/sdm845-mainline/alsa-ucm-conf.git
        cd alsa-ucm-conf
        rm -rf /usr/share/alsa/ucm2
        cp -a ucm2 /usr/share/alsa
        cd ..

        # Testing (diag-router)
        git clone https://github.com/linux-msm/diag.git
        cd diag
        make -j$(nproc) prefix=/usr
        make -j$(nproc) prefix=/usr install
        cd ..

        # qbootctl (mark boot slot as successful)
        #git clone https://gitlab.com/sdm845-mainline/qbootctl.git
        #cd qbootctl
        #meson build
        #meson compile -C build
        #meson install -C build

        # msm-modem-uim-selection
        # This script is used to select the correct uim application for dual-sim devices
        # (runs before ModemManager), otherwise you will get "sim-missing" failed state.

        # clean up
        rm -rf /tmp/sdm845-support

EOF`);
}

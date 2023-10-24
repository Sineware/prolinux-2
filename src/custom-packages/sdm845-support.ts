import exec from "../helpers/exec"
import { BUILD_DIR, MUSL_TOOLCHAIN, ROOTFS_DIR, arch } from "../helpers/consts";
export function compileSDM845SupportPackages() {
    if(arch != "arm64") {
        console.log("SDM845 support packages are only available for arm64");
        return;
    }
    // exec arch-chroot
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e

        cd /tmp

        git clone https://github.com/andersson/qrtr.git
        cd qrtr
        make -j$(nproc) prefix=/usr all
        make -j$(nproc) prefix=/usr install
        cd ..

        git clone https://github.com/andersson/rmtfs.git
        cd rmtfs
        make -j$(nproc) prefix=/usr
        make -j$(nproc) prefix=/usr install
        echo 'SUBSYSTEM=="uio", ATTR{name}=="rmtfs", SYMLINK+="qcom_rmtfs_uio1"' > /usr/lib/udev/rules.d/65-rmtfs.rules
        cd ..

        git clone https://github.com/andersson/pd-mapper.git
        cd pd-mapper
        make -j$(nproc) prefix=/usr
        make -j$(nproc) prefix=/usr install
        cd ..

        git clone https://github.com/andersson/tqftpserv.git
        cd tqftpserv
        make -j$(nproc) prefix=/usr
        make -j$(nproc) prefix=/usr install
        cd ..


        # todo: prolinuxd will eventually read device_codename and start
        systemctl enable rmtfs
        systemctl enable pd-mapper
        systemctl enable tqftpserv
        systemctl enable qrtr-ns
EOF`);
}

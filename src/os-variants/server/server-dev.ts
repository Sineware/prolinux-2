import exec from "../../helpers/exec";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT } from '../../helpers/consts';

export async function buildServerDev() {
    console.log("Building ProLinux Server (Dev)");
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
            echo "Installing packages for server-dev profile";
EOF`);
}
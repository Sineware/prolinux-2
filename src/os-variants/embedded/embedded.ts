import exec from "../../helpers/exec";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT } from '../../helpers/consts';

export async function buildEmbedded() {
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
            sudo pacman -S --noconfirm plasma-meta plasma-wayland-session konsole firefox dolphin
EOF`);
}
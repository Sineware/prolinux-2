import exec from "../../helpers/exec";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT } from '../../helpers/consts';
import { buildMobileDev } from "../mobile/mobile-dev";

export async function buildEmbeddedDev() {
    console.log("Basing image on mobile-dev");
    await buildMobileDev();
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
            # base system packages
            sudo pacman -S --noconfirm xorg

            systemctl disable plasma-mobile
            systemctl enable plasma-desktop
EOF`);
    // todo setup desktop defaults
}
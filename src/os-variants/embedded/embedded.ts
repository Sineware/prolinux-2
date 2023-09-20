import exec from "../../helpers/exec";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT } from '../../helpers/consts';

export async function buildEmbedded() {
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
            # base system packages
            sudo pacman -S --noconfirm plasma-meta plasma-wayland-session konsole kate kcalc firefox dolphin discover
            # productivity packages
            sudo pacman -S --noconfirm libreoffice-fresh rkward 
            # creative
            sudo pacman -S --noconfirm gimp krita kdenlive
            # games
            sudo pacman -S --noconfirm kmines kbreakout


            echo "Installing packages for thinclient profile"
            # todo
EOF`);
}
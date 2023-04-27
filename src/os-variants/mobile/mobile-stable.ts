import exec from "../../helpers/exec";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT } from '../../helpers/consts';

export async function buildMobileStable() {
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        yes | sudo pacman -S pipewire-media-session --noconfirm --ask 4
        echo "[danctnix]" >> /etc/pacman.conf
        echo 'Server = https://p64.arikawa-hi.me/$repo/$arch/' >> /etc/pacman.conf
        echo "SigLevel = Never" >> /etc/pacman.conf
        sudo pacman -Syy --noconfirm

        sudo pacman -S --noconfirm danctnix-pm-ui-meta qmlkonsole angelfish dolphin discover
EOF`);
}

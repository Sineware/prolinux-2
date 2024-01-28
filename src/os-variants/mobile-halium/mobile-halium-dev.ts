import exec from "../../helpers/exec";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT } from '../../helpers/consts';
import { buildMobileDev } from "../mobile/mobile-dev";
import { compileHybrisSupportPackages, compileHaliumSupportPackages } from "../../custom-packages/hybris-support";

export async function buildMobileHaliumDev() {
    console.log("Basing image on mobile-dev");
    await buildMobileDev();
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
            
EOF`);

    // install hybris support
    compileHybrisSupportPackages();
    compileHaliumSupportPackages();
}
#!/usr/bin/env bash
set -e

cd prolinux-kernel-init && ./build.sh && cd ..

./scripts/unmount.sh
#TARGET_DEVICE=pine64-pinephone,pine64-pinephonepro,pine64-pinebookpro,xiaomi-beryllium:tianma,oneplus-enchilada npm run build
TARGET_DEVICE=sineware-arm64 npm run build

./scripts/unmount.sh
#TARGET_DEVICE=postmarketos-trailblazer npm run gen-image
# TARGET_DEVICE=pine64-pinephone npm run gen-image
# TARGET_DEVICE=pine64-pinephonepro npm run gen-image
# TARGET_DEVICE=pine64-pinebookpro npm run gen-image

# TARGET_DEVICE=xiaomi-beryllium:tianma npm run gen-image
# TARGET_DEVICE=oneplus-enchilada npm run gen-image
TARGET_DEVICE=sineware-arm64 npm run gen-image-generic
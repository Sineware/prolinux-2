#!/usr/bin/env bash
# Inside container
set -e
VERSION=6.11

# If sources/linux-$VERSION.tar.xz does not exist, download it
if [ ! -f /sources/linux-$VERSION.tar.xz ]; then
    curl https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-$VERSION.tar.xz -o /sources/linux-$VERSION.tar.xz
fi

cd /kernel/work
rm -rf linux-* compiled
ls -al
mkdir -pv compiled
tar -xf /sources/linux-$VERSION.tar.xz

cd linux-$VERSION
ccache --max-size=10G
echo "max_size = 10.0G" > /etc/ccache.conf

make mrproper


ARCH=$(uname -m)
if [ "$ARCH" == "aarch64" ]; then
    echo "Applying ARM64 config"

    # add PMOS config
    curl https://gitlab.com/postmarketOS/pmaports/-/raw/master/device/testing/linux-next/pmos.config -o arch/arm64/configs/pmos.config

    curl https://gitlab.com/postmarketOS/pmaports/-/raw/master/device/testing/linux-next/devices.config -o arch/arm64/configs/devices.config

    # Add our custom config, prolinux.arm64.config
    cp /kernel/prolinux.arm64.config arch/arm64/configs/prolinux.arm64.config

    make ARCH=arm64 defconfig pmos.config devices.config prolinux.arm64.config
else
    echo "Applying x86_64 config"
    cat /kernel/prolinux.x86_64.config > .config
fi


make -j$(nproc) LOCALVERSION=-sineware CC="ccache gcc" CXX="ccache g++"

ccache -s

mkdir -pv /output
rm -rf /output/*
ARCH=$(uname -m)
if [ "$ARCH" == "aarch64" ]; then
    cp arch/arm64/boot/vmlinuz.efi /output/Image
    # todo vmlinuz.efi
else
    cp arch/x86_64/boot/bzImage /output/Image
fi

# output kernel modules to /output/
mkdir -pv /output/modules /output/dtbs
make modules_install INSTALL_MOD_PATH=/output/modules INSTALL_MOD_STRIP=1
# make dtbs_install INSTALL_DTBS_PATH=/output/dtbs

# cleanup
rm -rf /output/modules/lib/modules/*/build /output/modules/lib/modules/*/source
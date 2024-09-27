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
make defconfig

# add PMOS config to existing defconfig
curl https://gitlab.com/postmarketOS/pmaports/-/raw/master/device/testing/linux-next/pmos.config -o pmos.config
cat pmos.config >> .config

curl https://gitlab.com/postmarketOS/pmaports/-/raw/master/device/testing/linux-next/devices.config -o devices.config
cat devices.config >> .config

# Add our custom config, prolinux.arm64.config
cat /kernel/prolinux.arm64.config >> .config

make -j$(nproc) LOCALVERSION=-sineware CC="ccache gcc" CXX="ccache g++"

ccache -s

mkdir -pv /output
rm -rf /output/*
ARCH=$(uname -m)
if [ "$ARCH" == "aarch64" ]; then
    cp arch/arm64/boot/Image /output/
else
    cp arch/x86_64/boot/bzImage /output/
fi

# output kernel modules to /output/
mkdir -pv /output/modules /output/dtbs
make modules_install INSTALL_MOD_PATH=/output/modules
make dtbs_install INSTALL_DTBS_PATH=/output/dtbs

# cleanup
rm -rf /output/modules/lib/modules/*/build /output/modules/lib/modules/*/source
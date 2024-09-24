
#!/usr/bin/env bash
set -e
echo "~ Sineware Kernel + Init Build System for ProLinux ~"

# Kernel Compile
KERNEL_DIR=$(pwd)/kernel
SOURCES_DIR=$(pwd)/sources
OUTPUT_DIR=$(pwd)/output

mkdir -pv $KERNEL_DIR/ccache $KERNEL_DIR/work

pushd .
    cd kernel/
    docker build -t kernel-build .
popd

time docker run --rm \
    -v $KERNEL_DIR:/kernel \
    -v $SOURCES_DIR:/sources \
    -v $OUTPUT_DIR:/output \
    -v $KERNEL_DIR/ccache:/root/.ccache \
    kernel-build \
    /bin/bash -c "cd /kernel && ./build-kernel.sh"

# Initramfs
cd initramfs/ && ./build-initramfs.sh && cd ..

# Disk Image
cd disk && ./create-image.sh && cd ..

# Bootloader
cd bootloader && ./build-grub-efi.sh && cd ..

#!/usr/bin/env bash
set -e
docker build -t prolinux-initramfs .

CONTAINER_ID=$(docker create prolinux-initramfs)

mkdir -pv work
mkdir -pv output

rm -rf work/* output/*

docker export $CONTAINER_ID | tar -C work -xvf -
docker rm $CONTAINER_ID

# copy modules from ../output/modules/* to work/ by mergeing the lib folder in there
mkdir -pv work/lib/modules
cp -r ../output/modules/lib/modules/* work/lib/modules/

# Bundle into init cpio gz
pushd .
    cd work
    rm -rf dev/*
    find . | cpio -H newc -o | pigz > ../output/initramfs.cpio.gz
popd

# Cleanup
#rm -rf work
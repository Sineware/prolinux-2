#!/usr/bin/env bash

echo "Making sure everything is unmounted..."

sudo umount -R build/rootfs
sudo umount -R build/pmos_boot_mnt
sudo umount -R build/pmos_root_mnt

sleep 1

sudo umount -R /dev/disk/by-label/pmOS_root
sudo umount -R /dev/disk/by-label/pmOS_boot

sleep 1

sudo losetup -d /dev/disk/by-label/pmOS_root
sudo losetup -d /dev/disk/by-label/pmOS_boot

sleep 1

echo "Unmounted!"
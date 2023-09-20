#!/usr/bin/env bash
set -e
echo "Building ProLinux SDK"
mkdir -pv staging
#cp -v ../output/prolinux-root-mobile-dev.tar staging/
docker build -t prolinux-sdk .
echo "Done!"
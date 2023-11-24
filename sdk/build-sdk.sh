#!/usr/bin/env bash
set -e
echo "Building ProLinux SDK"
mkdir -pv staging
#cp -v ../output/prolinux-root-mobile-dev.tar staging/
docker build --ulimit "nofile=1024:1048576" -t sineware/prolinux-sdk . 
echo "Done!"
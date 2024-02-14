#!/usr/bin/env bash
set -e
echo "Building ProLinux SDK"

if [ ! -f Dockerfile ]; then
  echo "This script must be run from the sdk directory"
  exit 1
fi

mkdir -pv staging
#cp -v ../output/prolinux-root-mobile-dev.tar staging/
docker build --ulimit "nofile=1024:1048576" -t sineware/prolinux-sdk:latest . 
echo "Done!"
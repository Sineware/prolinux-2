#!/usr/bin/env bash
set -e
export TARGET_DEVICE=sineware-x64 
export MUSL_TOOLCHAIN=/opt/x86_64-linux-musl-native

npm run build
npm run gen-image-generic

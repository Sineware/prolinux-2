#!/usr/bin/env bash
set -e
TARGET_DEVICE=tablet-x64uefi:edge npm run build

TARGET_DEVICE=tablet-x64uefi:edge npm run gen-image

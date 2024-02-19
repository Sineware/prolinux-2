#!/usr/bin/env bash
set -e
export TARGET_DEVICE=generic-x86_64:edge 

npm run build
npm run gen-image

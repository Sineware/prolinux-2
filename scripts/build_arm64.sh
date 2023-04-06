#!/usr/bin/env bash
TARGET_DEVICE=pine64-pinephone,pine64-pinephonepro,pine64-pinebookpro npm run build
TARGET_DEVICE=pine64-pinephone npm run gen-image
TARGET_DEVICE=pine64-pinephonepro npm run gen-image
TARGET_DEVICE=pine64-pinebookpro npm run gen-image
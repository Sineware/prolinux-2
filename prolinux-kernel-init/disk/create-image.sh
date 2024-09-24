#!/usr/bin/env bash
set -e
rm -rf disk-image.raw
python gpt-image-script.py

truncate -s 8G disk-image.raw
mv disk-image.raw ../output/disk-image.img

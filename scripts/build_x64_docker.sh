#!/usr/bin/env bash
set -e
echo "Running ProLinux 2 Build using the ProLinux SDK Container"
if [ ! -f package.json ]; then
  echo "This script must be run from the root of the project"
  exit 1
fi

docker run --rm --privileged=true -v /dev:/dev -v $(pwd):/home/user/prolinux-2 sineware/prolinux-sdk:latest bash -c "cd /home/user/prolinux-2 && ./scripts/unmount.sh && ./scripts/build_x64.sh"
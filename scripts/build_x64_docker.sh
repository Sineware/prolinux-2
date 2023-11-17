#!/usr/bin/env bash
set -e



#docker run -it prolinux-sdk:latest bash
# run ./scripts/build_x64.sh in the container and mount cwd to /home/user/prolinux-2

docker run -it -v $(pwd):/home/user/prolinux-2 prolinux-sdk:latest bash -c "cd /home/user/prolinux-2 && ./scripts/build_x64.sh"
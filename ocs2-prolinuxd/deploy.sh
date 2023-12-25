#!/usr/bin/env bash
set -e
USER=user
HOST=172.16.42.1
PORT=22
DIR=/opt/prolinuxd/

rsync -avz -e "ssh -p ${PORT}" dist/ ${USER}@${HOST}:${DIR}
exit 0
#!/usr/bin/env bash
USER=swadmin
HOST=192.168.11.213
PORT=22
DIR=/home/swadmin/jenkins/workspace/prolinux-2-mobile-dev-arm64

rsync -e "ssh -p ${PORT}" -avz --exclude="tmp" --exclude ".git" --exclude "node_modules" --exclude "build" --exclude "output" . ${USER}@${HOST}:${DIR}

#!/usr/bin/env bash
USER=pi
HOST=hayasaka
PORT=22
DIR=/storagepool/hayasaka-pi/prolinux-2

rsync -e "ssh -p ${PORT}" -avz --exclude ".git" --exclude "node_modules" --exclude "build" --exclude "output" . ${USER}@${HOST}:${DIR}
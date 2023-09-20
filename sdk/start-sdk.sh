#!/usr/bin/env bash
echo "Starting ProLinux 2 SDK for Plasma Mobile..."

USER_ID=$(id -u)
GROUP_ID=$(id -g)

docker run -it prolinux-sdk:latest bash
#!/usr/bin/env bash
# ProLinux Remote Build for kdesrc-build
# Uses a target device running ProLinux to build kde packages over ssh
set -e

HOST=$1
PORT=$2
SRC_FOLDER=$3
PKG_NAME=$4


remote_cmd () {
    echo $(ssh -p ${PORT} ${HOST} "$1")
}

get_config () {
    echo $(remote_cmd "cat /sineware/data/prolinux.toml | grep $1" | cut -d'=' -f2 | tr -d '"')
}

if [ "$(get_config "pl2.locked_root")" = "true" ]; then
    echo "[FAIL] Your devices root filesystem is locked! Run 'plctl root-lock off' to disable it."
    exit 1
else
    echo "[OK] Root filesystem is unlocked"
fi


if [ "$(remote_cmd "test -d /opt/kde/src/kdesrc-build && echo 1 || echo 0")" = "0" ]; then
    echo "[OK] [First Run] Installing kdesrc-build..."
    remote_cmd "cd /opt/kde/src && git clone https://invent.kde.org/sdk/kdesrc-build.git"
    remote_cmd "cd /opt/kde/src/kdesrc-build && ./kdesrc-build --version"
    remote_cmd "cd /opt/kde/src/kdesrc-build && ./kdesrc-build --initial-setup"
else
    echo "[OK] kdesrc-build already installed"
fi


#check if $SRC_FOLDER exists
if [ ! -d "$SRC_FOLDER" ]; then
    echo "[FAIL] Local folder '$SRC_FOLDER' does not exist!"
    exit 2
fi

# RSync $SRC_FOLDER to remote /opt/kde/src/$PKG_NAME
echo "Syncing $SRC_FOLDER to remote /opt/kde/src/$PKG_NAME"
rsync -e "ssh -p ${PORT}" --info=progress2 -avz $SRC_FOLDER ${HOST}:/opt/kde/src/$PKG_NAME

echo "Starting build..."
remote_cmd "cd /opt/kde/src/kdesrc-build && ./kdesrc-build --version"
remote_cmd "cd /opt/kde/src/kdesrc-build && ./kdesrc-build $PKG_NAME --no-src"

#!/usr/bin/env bash
# ProLinux Remote Build for kdesrc-build
# Uses a target device running ProLinux to build kde packages over ssh
set -ex

HOST=$1
PORT=$2
SRC_FOLDER=$3
PKG_NAME=$4


remote_cmd () {
    echo $(ssh -p ${PORT} ${HOST} "$1")
}

echo $1

# read the "pl2.selected_root=false" from /sineware/data/prolinux.toml, if it is true then exit
if [ "$(remote_cmd "cat /sineware/data/prolinux.toml | grep pl2.root_lock | cut -d '=' -f2 | tr -d ' ' | tr -d \"'\")" = "true" ]; then
    echo "Your devices root filesystem is locked!"
    echo "Please run 'plctl root-lock false' on your device to unlock it."
    exit 1
fi

if [ "$(remote_cmd "test -d /opt/kde/src/kdesrc-build && echo 1 || echo 0")" = "0" ]; then
    echo "[First Run] Installing kdesrc-build..."
    remote_cmd "cd /opt/kde/src && git clone https://invent.kde.org/sdk/kdesrc-build.git"
fi

# RSync $SRC_FOLDER to remote /opt/kde/src/$PKG_NAME
echo "Syncing $SRC_FOLDER to remote /opt/kde/src/$PKG_NAME"
rsync -e "ssh -p ${PORT}" --info=progress2 -avz $SRC_FOLDER ${HOST}:/opt/kde/src/$PKG_NAME

echo "Starting build..."
remote_cmd "cd /opt/kde/src/kdesrc-build && ./kdesrc-build --version"
remote_cmd "cd /opt/kde/src/kdesrc-build && ./kdesrc-build $PKG_NAME --no-src"

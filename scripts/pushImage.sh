#!/usr/bin/env bash
set -e 
USER=user
HOST=192.168.11.109
PORT=22
DIR=/home/user/

SELECTED_ROOT=$(ssh -p ${PORT} ${USER}@${HOST} "cat /sineware/data/prolinux.toml" | grep "pl2.selected_root" | cut -d "=" -f2 | tr -d "'")
echo "Selected root: ${SELECTED_ROOT}"

echo "Pushing image to ${HOST}:${DIR}"
rsync -e "ssh -p ${PORT}" --info=progress2 -avz ./output/prolinux-root-embedded-dev.squish ${USER}@${HOST}:${DIR}

if [ "$SELECTED_ROOT" == " a" ]; then
    echo "Setting root to b..."
    ssh -p ${PORT} ${USER}@${HOST} "sed -i '/pl2.selected_root/d' /sineware/data/prolinux.toml"
    ssh -p ${PORT} ${USER}@${HOST} "echo \"pl2.selected_root = 'b'\" >> /sineware/data/prolinux.toml"
    ssh -p ${PORT} ${USER}@${HOST} "sudo cp prolinux-root-embedded-dev.squish /sineware/prolinux_b.squish"
else
    echo "Setting root to a..."
    ssh -p ${PORT} ${USER}@${HOST} "sed -i '/pl2.selected_root/d' /sineware/data/prolinux.toml"
    ssh -p ${PORT} ${USER}@${HOST} "echo \"pl2.selected_root = 'a'\" >> /sineware/data/prolinux.toml"
    ssh -p ${PORT} ${USER}@${HOST} "sudo cp prolinux-root-embedded-dev.squish /sineware/prolinux_a.squish"

fi

# reboot device
ssh -p ${PORT} ${USER}@${HOST} "sudo reboot"
#!/bin/bash
# if the /sineware/data/customization/etc/ssh folder does not exist, generate a new host key
if [ ! -d /sineware/data/customization/etc/ssh ]; then
    mkdir -pv /sineware/data/customization/etc/ssh
    ssh-keygen -A -f /sineware/data/customization
fi
killall pbsplash
#!/bin/bash
# if the /sineware/data/customization/etc/ssh folder does not exist, generate a new host key
if [ ! -d /sineware/data/customization/etc/ssh ]; then
    mkdir -pv /sineware/data/customization/etc/ssh
    ssh-keygen -A -f /sineware/data/customization
    systemctl restart sshd
fi

# todo investigate this
chmod 4755 /usr/bin/bwrap

# switch to the user user and add flathub if it is not already added
su - user -c "flatpak remote-add --if-not-exists --collection-id=org.flathub.Stable --gpg-import /opt/flatpak/flathub.gpg --user flathub /opt/flatpak/flathub.flatpakrepo"
killall pbsplash
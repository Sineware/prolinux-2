#!/bin/bash

# if the /sineware/data/customization/etc/ssh folder does not exist, generate a new host key
if [ ! -d /sineware/data/customization/etc/ssh ]; then
    echo "Generating new host keys"
    mkdir -pv /sineware/data/customization/etc/ssh
    ssh-keygen -A -f /sineware/data/customization
    systemctl restart sshd
fi

# todo investigate this
chmod 4755 /usr/bin/bwrap

# offline install of flathub for default user
echo "Installing flathub for default user"
cp /opt/flatpak/flathub.trustedkeys.gpg ~/.local/share/flatpak/repo/flathub.trustedkeys.gpg
su - user -c "flatpak remote-add --if-not-exists --collection-id=org.flathub.Stable --gpg-import /opt/flatpak/flathub.gpg --user flathub /opt/flatpak/flathub.flatpakrepo"

echo "Killing pbsplash"
killall pbsplash || true
#!/usr/bin/env bash

# arg $1 is the bridge interface MAC address

# First, let's stop NetworkManager to manually manage the network interfaces.
echo "Stopping NetworkManager..."
sudo systemctl stop NetworkManager

# Define the bridge interface name
bridgeInterface="br0"

echo "loading br_netfilter kernel module..."
modprobe br_netfilter

# Check if the bridge interface already exists, if not, create it
if ! ip link show $bridgeInterface > /dev/null 2>&1; then
    echo "Creating bridge interface $bridgeInterface with MAC address $1..."
    ip link add name $bridgeInterface type bridge
    ip link set dev $bridgeInterface address $1

    echo "Adding NFQUEUE to bridge $bridgeInterface..."
    iptables -A FORWARD -i $bridgeInterface -j NFQUEUE --queue-num 0
    iptables -A FORWARD -o $bridgeInterface -j NFQUEUE --queue-num 0
    
else
    echo "Bridge interface $bridgeInterface already exists"
fi

# Find all available network interfaces except the lo and the bridge itself
interfaces=$(ls /sys/class/net | grep -vE "lo|$bridgeInterface")

for i in $interfaces; do
    # Exclude interfaces already part of a bridge
    if [ ! -d "/sys/class/net/$i/bridge" ]; then
        echo "Adding interface $i to bridge $bridgeInterface"
        ip link set dev $i down
        ip link set dev $i master $bridgeInterface
        ip link set dev $i up
    else
        echo "Interface $i is already part of a bridge, skipping."
    fi
done

# Bring up the bridge interface
ip link set dev $bridgeInterface up

# Configure the bridge interface for DHCP
echo "Setting up DHCP for $bridgeInterface..."
dhclient $bridgeInterface

echo "Bridge setup complete. Interfaces acting as a switch now!"
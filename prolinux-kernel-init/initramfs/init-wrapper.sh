#!/usr/bin/env bash
echo "- Sineware -"

mount -t proc none /proc
mount -t sysfs none /sys
mount -t devtmpfs none /dev
sleep 1

# todo: temp
echo "Early initializing devices..."
echo "Modules before: $(lsmod | wc -l)"
depmod -a
find /sys -name modalias | xargs sort -u | xargs modprobe -a 2> /dev/null
echo "Modules after: $(lsmod | wc -l)"

echo "Starting init.py"
echo "..."

python /init.py
exec switch_root /sysroot/oroot /sbin/init
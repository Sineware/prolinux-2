import os
import subprocess
import time
import tomllib
import re

print("Welcome to ProLinux!")
os.system("uname -a")
print(">.<")

deviceinfo_codename = "postmarketos-trailblazer"

def run_command(command, error_message):
    """Run a shell command, handle failure"""
    try:
        subprocess.run(command, shell=True, check=True)
    except subprocess.CalledProcessError:
        print(f"ERROR: {error_message}")
        time.sleep(5)
        os.system("/bin/bash")
        raise

def mount_disk(device, mount_point, options=None, type=None):
    """Mount a disk with optional mount options"""
    cmd = f"mount {device} {mount_point}"
    if options:
        cmd += f" -o {options}"
    if type:
        cmd += f" -t {type}"
    run_command(cmd, f"Could not mount {device} on {mount_point}")

def find_root_partition():
    """Find the root partition by label or UUID"""
    # Example using blkid to find a partition with a label 'SYSROOT'
    try:
        result = subprocess.check_output("blkid | grep 'LABEL=\"plfs_data\"'", shell=True)
        match = re.search(r'/dev/\w+', result.decode('utf-8'))
        if match:
            return match.group(0)
    except subprocess.CalledProcessError:
        print("ERROR: Could not find SYSROOT partition.")
    return None

def splash_error(message):
    print(f"ERROR: {message}")
    time.sleep(5)
    os.system("/bin/bash")

def read_config(filepath):
    """read the configuration from the toml file"""
    try:
        with open(filepath, 'rb') as f:
            return tomllib.load(f)
    except FileNotFoundError:
        splash_error(f"could not find config file at {filepath}")
    except Exception as e:
        splash_error(f"error reading config: {str(e)}")

def main():
    print("Running ProLinux Init script...")
    # Optional: Show splash screen
    # run_command('show_splash "Loading system configuration..."', "Could not show splash")

    # Kill existing splash screen process
    # run_command("pkill pbsplash", "Could not kill pbsplash")

    print("-- Welcome to Sineware ProLinux 2 --")

    # Load kernel modules
    run_command("modprobe squashfs", "Could not load squashfs module!")
    run_command("modprobe overlay", "Could not load overlayfs module!")
    run_command("modprobe loop", "Could not load loop module!")

    # Find and mount root partition
    root_partition = find_root_partition()
    if not root_partition:
        splash_error("Could not find root partition!")
    mount_disk(root_partition, "/sysroot")

    # Read system configuration from TOML
    config = read_config("/sysroot/data/prolinux.toml")
    selected_root = config["pl2"].get("selected_root", "a")
    locked_root = config["pl2"].get("locked_root", False)
    disable_kexec = config["pl2"].get("disable_kexec", False)

    print(config)
    print(f"Selected Root: {selected_root}")
    print(f"Locked Root: {locked_root}")
    print(f"Disable Kexec: {disable_kexec}")
    
    print("----")
        

    # Mount the selected squashfs
    mount_disk(f"/sysroot/prolinux_{selected_root}.squish", "/sysroot/squishroot", "loop")

    # Check if in stage 2
    with open("/proc/cmdline") as f:
        cmdline = f.read()
    #in_stage2 = "pl2.stage2" in cmdline or disable_kexec == "true"
    in_stage2 = True
    if in_stage2:
        print("Loaded stage 2 kernel!")

        # Reset persistroot if necessary
        if os.path.exists("/sysroot/data/.reset_persistroot"):
            run_command("rm -rf /sysroot/persistroot/*", "Could not reset persistroot!")
            run_command("rm -rf /sysroot/data/.reset_persistroot", "Could not remove reset flag!")

        os.makedirs("/sysroot/data/customization", exist_ok=True)

        if locked_root == True:
            print("Locked rootfs detected, mounting...")
            os.makedirs("/tmproot", exist_ok=True)
            mount_disk("tmpfs", "/tmproot", "tmpfs")
            os.makedirs("/tmproot/overlay", exist_ok=True)
            os.makedirs("/tmproot/workdir", exist_ok=True)
            mount_disk("overlay", "/sysroot/oroot", 
                       "lowerdir=/sysroot/data/customization:/sysroot/persistroot:/sysroot/squishroot,upperdir=/tmproot/overlay,workdir=/tmproot/workdir",
                       "overlay")
        else:
            mount_disk("overlay", "/sysroot/oroot", 
                       "lowerdir=/sysroot/data/customization:/sysroot/squishroot,upperdir=/sysroot/persistroot,workdir=/sysroot/workdir",
                       "overlay")

        print("Binding persistent directories into oroot")
        run_command("mount --bind /sysroot /sysroot/oroot/sineware", "Could not bind /sysroot to oroot")
        run_command("mount --bind /sysroot/data/home /sysroot/oroot/home", "Could not bind home directory")

        # Bind modules and firmware
        # os.makedirs("/sysroot/oroot/lib/modules", exist_ok=True)
        # mount_disk(f"/sysroot/squishroot/opt/device-support/{deviceinfo_codename}/modules", "/sysroot/oroot/usr/lib/modules")
        
        # os.makedirs("/sysroot/oroot/lib/firmware", exist_ok=True)
        # mount_disk(f"/sysroot/squishroot/opt/device-support/{deviceinfo_codename}/firmware", "/sysroot/oroot/usr/lib/firmware")

        # Bind container directories
        # os.makedirs("/sysroot/data/containers", exist_ok=True)
        # run_command("mount --bind /sysroot/data/containers /sysroot/oroot/var/lib/containers", "Could not bind container directories")

        print(f"Device Info Codename: {deviceinfo_codename}")
        with open("/sysroot/deviceinfo_codename", "w") as f:
           f.write(deviceinfo_codename)

        # List contents of important directories
        run_command("ls -l /sysroot", "Could not list /sysroot")
        run_command("ls -l /sysroot/oroot", "Could not list /sysroot/oroot")

        print("Starting up...")

        # switch_root into /sysroot/oroot
        run_command("umount /sys", "Could not unmount /sys")
        run_command("umount /proc", "Could not unmount /proc")
        run_command("umount /dev", "Could not unmount /dev")

        #os.execvp("switch_root", ["switch_root", "/sysroot/oroot", "/sbin/init"])
    else:
        print(f"Loading stage 2 kernel (kexec) from /sysroot/squishroot/device-support/{deviceinfo_codename}/...")
        cmdline = re.sub(r"initcall_blacklist=[^ ]*", "", cmdline)
        cmdline = re.sub(r"modprobe.blacklist=[^ ]*", "", cmdline)
        cmdline += " pl2.stage2"

        kexec_cmd = (f"kexec -l /sysroot/squishroot/opt/device-support/{deviceinfo_codename}/vmlinuz* "
                     f"--initrd=/sysroot/squishroot/opt/device-support/{deviceinfo_codename}/initramfs "
                     f"--append=\"{cmdline}\"")
        run_command(kexec_cmd, "Could not load kexec stage 2 kernel!")
        run_command("umount /sysroot/squishroot", "Could not unmount squishroot")
        run_command("kexec -e", "Could not execute kexec")

        splash_error("Could not kexec stage 2 kernel!")

if __name__ == "__main__":
    main()

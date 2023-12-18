import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT, NODEJS_PACKAGE } from './helpers/consts';
import exec from "./helpers/exec";
import { createAndMountPMOSImage, genPMOSImage, pmosFinalCleanup } from './pmbootstrap';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { compileKexecTools } from './custom-packages/kexec-tools';
import { compileSDM845SupportPackages } from './custom-packages/sdm845-support';
import { buildMobileDev } from './os-variants/mobile/mobile-dev';
import { buildEmbedded } from './os-variants/embedded/embedded';
import { buildEmbeddedDev } from './os-variants/embedded/embedded-dev';
import { buildMobileStable } from './os-variants/mobile/mobile-stable';
import { buildMobileCommon } from './os-variants/mobile/mobile-common';

console.log("Starting ProLinux build on " + new Date().toLocaleString());

const ARCH_URL = {
    "x64": "https://archive.archlinux.org/iso/2023.12.01/archlinux-bootstrap-2023.12.01-x86_64.tar.gz",
    "arm64": "http://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz"
}

async function cleanup() {
    console.log("Cleaning up...");
    exec(`sudo umount -R ${ROOTFS_DIR}`);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("Build dirs: " + BUILD_DIR + ", " + ROOTFS_DIR + ", " + FILES_DIR);
    console.log("Platform arch: " + arch);
    console.log("Target device: " + TARGET_DEVICE + ", variant: " + PROLINUX_VARIANT + ", channel: " + PROLINUX_CHANNEL);
    if(TARGET_DEVICE === undefined || TARGET_DEVICE === "" || PROLINUX_CHANNEL === undefined || PROLINUX_CHANNEL === "" || PROLINUX_VARIANT === undefined || PROLINUX_VARIANT === "") {
        console.log("No target device specified, exiting");
        process.exit(1);
    }
    /*if(PROLINUX_CHANNEL !== "dev") {
        console.log("Unsupported channel: " + PROLINUX_CHANNEL + ", exiting");
        process.exit(1);
    }*/
    if(!fs.existsSync(`${__dirname}/../ocs2-prolinuxd/package.json`)) {
        console.log("ocs2-prolinuxd submodule not cloned, exiting");
        process.exit(1);
    }

    // Get latest build number for https://update.sineware.ca/updates/prolinux/PROLINUX_VARIANT/PROLINUX_CHANNEL
    // {"url":"https:\/\/example.com\/rootfs.squish","variant":"phone","jwt":"jwt","product":"prolinux","id":1,"buildstring":"test build","buildnum":1001,"channel":"dev","isreleased":true,"uuid":"E0CE308F-4350-41AD-87F7-40D7835DC7D2"}
    const res = await axios.get(`https://update.sineware.ca/updates/prolinux/${PROLINUX_VARIANT}/${PROLINUX_CHANNEL}`, {timeout: 5000});
    console.log(res.data);
    const buildnum = res.data.buildnum + 1;
    const builduuid = uuidv4();
    console.log("Latest build number: " + buildnum + ", " + builduuid);

    exec(`mkdir -pv ${BUILD_DIR}`);
    exec(`mkdir -pv ${OUTPUT_DIR}`);
    exec(`sudo rm -rf ${OUTPUT_DIR}/*`);
    exec(`sudo mkdir -pv ${ROOTFS_DIR}`);
    process.chdir(BUILD_DIR);

    // download arch linux if not exists
    if (fs.existsSync(`${BUILD_DIR}/arch.tar.gz`)) {
        console.log("Arch root already downloaded");
    } else {
        const arch_url = ARCH_URL[arch as keyof typeof ARCH_URL];
        console.log("Downloading Arch root from " + arch_url);
        exec(`curl -L ${arch_url} -o ${BUILD_DIR}/arch.tar.gz`);
    }

    exec(`sudo umount -R ${ROOTFS_DIR}/ || true`);
    exec(`sudo rm -rf ${ROOTFS_DIR}/*`);
    exec(`sudo rm -rf ${BUILD_DIR}/rootfs.img`);
    
    console.log("Creating and mounting rootfs.img");
    exec(`sudo fallocate -l 50G ${BUILD_DIR}/rootfs.img`);
    exec(`sudo mkfs.ext4 -L pmOS_root ${BUILD_DIR}/rootfs.img`);
    exec(`sudo mount ${BUILD_DIR}/rootfs.img ${ROOTFS_DIR}`);
 
    // extract arch root to rootfs
    exec(`sudo tar -xvf ${BUILD_DIR}/arch.tar.gz -C ${ROOTFS_DIR} --strip-components=1`);  

    console.log("Bind mounting pacman cache...");
    exec(`sudo mkdir -pv ${ROOTFS_DIR}/var/cache/pacman/pkg`);
    exec(`sudo mkdir -pv ${BUILD_DIR}/pacman-cache`);
    exec(`sudo mount --bind ${BUILD_DIR}/pacman-cache ${ROOTFS_DIR}/var/cache/pacman/pkg`);

    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e
        chown root:root /
        echo 'Server = ${arch === "arm64" ? "https://fl.us.mirror.archlinuxarm.org/$arch/$repo" : "https://mirror.xenyth.net/archlinux/$repo/os/$arch"}' > /etc/pacman.d/mirrorlist
        
        sed -i "s/#ParallelDownloads = 5/ParallelDownloads = 5/g" /etc/pacman.conf
        
        yes | pacman-key --init
        yes | pacman-key --populate ${arch === "arm64" ? "archlinuxarm" : "archlinux"}
        pacman -Syu --noconfirm
        pacman -S --noconfirm --needed base-devel git nano neofetch htop wget curl sudo bash-completion dialog qt6-base qt6-tools polkit libpipewire pipewire pipewire-pulse libwireplumber wireplumber libxcvt libnm networkmanager modemmanager wpa_supplicant libqalculate distcc ccache gdb kwayland5
        pacman -S --noconfirm --needed bluez xorg-xwayland openssh mold flatpak rsync xdg-desktop-portal xdg-user-dirs ddcutil lcms2
        pacman -S --noconfirm --needed appstream-qt libdmtx libxaw lua ttf-hack qrencode xorg-xmessage xorg-xsetroot zxing-cpp accountsservice exiv2 lmdb zsync
        pacman -S --noconfirm --needed maliit-keyboard qt5-graphicaleffects xdotool libdisplay-info qcoro-qt6 qtkeychain-qt6 libquotient cmark libphonenumber callaudiod reuse gpgme
        
        pacman -S --noconfirm --needed phonon-qt6-vlc pyside6 python-pyqt6 python-pyqt6-3d python-pyqt6-charts python-pyqt6-datavisualization python-pyqt6-networkauth python-pyqt6-sip python-pyqt6-webengine qt6-3d qt6-5compat qt6-base qt6-charts qt6-connectivity qt6-datavis3d qt6-declarative qt6-graphs qt6-grpc qt6-httpserver qt6-imageformats qt6-languageserver qt6-location qt6-lottie qt6-multimedia qt6-multimedia-ffmpeg qt6-multimedia-gstreamer qt6-networkauth qt6-positioning qt6-quick3d qt6-quick3dphysics qt6-quickeffectmaker qt6-quicktimeline qt6-remoteobjects qt6-scxml qt6-sensors qt6-serialbus qt6-serialport qt6-shadertools qt6-speech qt6-svg qt6-tools qt6-translations qt6-virtualkeyboard qt6-wayland qt6-webchannel qt6-webengine qt6-websockets qt6-webview   
        
        pacman -S --noconfirm --needed python-setuptools python-websocket-client python-wsaccel pyside6 freerdp noto-fonts noto-fonts-cjk noto-fonts-emoji libimobiledevice libcanberra upower udisks2
        # plasma-dialer
        pacman -S --noconfirm --needed abseil-cpp
        # koko, elisa
        pacman -S --noconfirm --needed mpv vlc
        # neochat
        #pacman -S --noconfirm --needed libquotient

        # fixes plasma-mobile app list
        pacman -S --noconfirm --needed xorg

        echo "Setting up user"
        ${arch === "x64" ? 'useradd -m -G wheel user' : ''}
        ${arch === "arm64" ? 'usermod -l user alarm' : ''}
        ${arch === "arm64" ? 'groupmod -n user alarm' : ''}
        ${arch === "arm64" ? 'usermod -d /home/user -m user' : ''}
        echo "user:147147" | chpasswd
        echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
        echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
        locale-gen
        echo "LANG=en_US.UTF-8" > /etc/locale.conf
        echo "KEYMAP=us" > /etc/vconsole.conf
        echo "prolinux-system" > /etc/hostname

        ln -sf /usr/share/zoneinfo/America/Toronto /etc/localtime

        mkdir /sineware
        sudo -u user bash << EOFSU
            echo "Setting CCache settings..."
            ccache -M 10G
            
            echo "Setting up flatpak..."
            sudo flatpak remote-delete flathub
            flatpak remote-add --if-not-exists --user flathub https://flathub.org/repo/flathub.flatpakrepo
EOFSU
        sleep 2
EOF`);

    // merge FILES_DIR/layout into rootfs
    console.log("Merging files from " + FILES_DIR + "/layout into " + ROOTFS_DIR);
    exec(`sudo rsync -a ${FILES_DIR}/layout/ ${ROOTFS_DIR}/`);

    /* Install NODEJS_PACKAGE */
    console.log("Installing NodeJS");
    exec(`sudo mkdir -pv ${ROOTFS_DIR}/opt/nodejs`);
    exec(`sudo curl -L ${NODEJS_PACKAGE} | sudo tar -xJv -C ${ROOTFS_DIR}/opt/nodejs --strip-components=1`);

    /* ------------- ProLinuxD ------------- */
    exec(`
        set -e
        pwd
        pushd .
            # Set PATH to include nodejs
            export PATH=${ROOTFS_DIR}/opt/nodejs/bin:$PATH
            node --version
            cd ${__dirname}/../ocs2-prolinuxd
            rm -rf dist/*
            npm ci
            tsc
            sudo mkdir -pv ${ROOTFS_DIR}/opt/prolinuxd
            sudo cp -rv dist/* ${ROOTFS_DIR}/opt/prolinuxd/
            sudo cp -v distro-files/plctl ${ROOTFS_DIR}/usr/sbin/

            # Copy node_modules
            sudo mkdir -pv ${ROOTFS_DIR}/opt/prolinuxd/node_modules
            sudo cp -rv node_modules/* ${ROOTFS_DIR}/opt/prolinuxd/node_modules/
        popd
    `);
    /* ------------- ProLinux GUI Tool ------------- */
    // copy ./prolinux-tool to /opt/prolinux-tool
    // make a .desktop file that runs /opt/prolinux-tool/prolinux-tool
    exec(`
        set -e
        pushd .
            cd ${__dirname}/../prolinux-tool
            sudo mkdir -pv ${ROOTFS_DIR}/opt/prolinux-tool

            sudo cp -rv * ${ROOTFS_DIR}/opt/prolinux-tool/
            sudo cp -v prolinux-tool.desktop ${ROOTFS_DIR}/usr/share/applications/
        popd
    `);
    
    if(PROLINUX_VARIANT === "mobile" && PROLINUX_CHANNEL === "dev") {
        /* ------------- ProLinux Mobile Dev (Plasma Mobile Nightly / kdesrc-build ) ------------- */
        await buildMobileCommon();
        await buildMobileDev();
    } else if(PROLINUX_VARIANT === "mobile" && PROLINUX_CHANNEL === "stable") {
        await buildMobileCommon();
        await buildMobileStable();
    } else if(PROLINUX_VARIANT === "embedded" && PROLINUX_CHANNEL === "stable") {
        /* ------------- ProLinux Embedded ------------- */
        await buildEmbedded();
    } else if (PROLINUX_VARIANT === "embedded" && PROLINUX_CHANNEL === "dev") {
        await buildEmbeddedDev();
    } else {
        throw new Error("Unknown ProLinux variant/channel");
    }

    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e

        #echo "HostKey /sineware/data/ssh-host-keys/ssh_host_rsa_key" >> /etc/ssh/sshd_config
        #echo "HostKey /sineware/data/ssh-host-keys/ssh_host_ecdsa_key" >> /etc/ssh/sshd_config
        #echo "HostKey /sineware/data/ssh-host-keys/ssh_host_ed25519_key" >> /etc/ssh/sshd_config

        systemctl enable NetworkManager
        systemctl enable sshd
        systemctl enable prolinux-setup
        systemctl enable prolinuxd
        systemctl enable getty@tty0
        
        mkdir -pv /opt/build-info
        echo "${buildnum},${builduuid},prolinux,${PROLINUX_VARIANT},${PROLINUX_CHANNEL},$(date),prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.squish,${arch}" >> /opt/build-info/prolinux-info.txt
        pacman -Q >> /opt/build-info/prolinux-sbom.txt
        ls /opt/kde/build/ >> /opt/build-info/prolinux-sbom.txt || true
EOF`);

    // drop to shell
    if(process.env.DEBUG === "true") {
        console.log("Debug shell:");
        exec(`sudo arch-chroot ${ROOTFS_DIR}`);
    }

    /* ------------- Addtional Packages ------------- */
    // kexec-tools (for initramfs)
    compileKexecTools();
    compileSDM845SupportPackages();

    /* ------------- Target Devices ------------- */
    const buildTargetDeviceSupport = (targetDevice: string) => {
        console.log(`Building ${targetDevice} support`);
        // Add pmos device /lib/modules and /usr/lib/firmware
        console.log("Adding pmos device modules and firmware");
        let kernel = "";
        let device = targetDevice;
        if(targetDevice.includes(":")) {
            [device, kernel] = targetDevice.split(":");
        }
        createAndMountPMOSImage(device, kernel);
        genPMOSImage(device);
        pmosFinalCleanup();
        // copy device image to staging
        exec(`
            sync
            sleep 1
            mkdir -pv ${BUILD_DIR}/img-staging
            sudo cp /tmp/postmarketOS-export/${device}.img ${BUILD_DIR}/img-staging/${device}.img
        `);
    };
    TARGET_DEVICE.split(",").forEach(buildTargetDeviceSupport);
    console.log("Stripping files from RootFS");
    exec(`
        sudo rm -rf ${ROOTFS_DIR}/opt/kde/build/
        sudo rm -rf ${ROOTFS_DIR}/opt/kde/src/
        #sudo rm -rf ${ROOTFS_DIR}/var/cache/pacman/pkg/ # bind mount
        #sudo rm -rf ${ROOTFS_DIR}/opt/kde/usr/share/kservices6/searchproviders/
        #sudo rm -rf ${ROOTFS_DIR}/usr/share/kservices5/searchproviders/

        sudo umount -R ${ROOTFS_DIR}/*  || true
    `);
    // Create squashfs from root
    exec(`mkdir -pv ${OUTPUT_DIR} && sudo mksquashfs ${ROOTFS_DIR} ${OUTPUT_DIR}/prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.squish -noappend -comp xz`);

    // Create tar from root
    //exec(`sudo tar -C ${ROOTFS_DIR} -cvf ${OUTPUT_DIR}/prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.tar .`);

    exec(`echo "${buildnum},${builduuid},prolinux,${PROLINUX_VARIANT},${PROLINUX_CHANNEL},$(date),prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.squish,${arch}" > ${OUTPUT_DIR}/prolinux-info.txt`);

    await sleep(2000);
    await cleanup();
}

try {
    main();
} catch (e) {
    console.error(e);
    cleanup();
}

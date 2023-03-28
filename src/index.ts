import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE } from './helpers/consts';
import exec from "./helpers/exec";
import { genPMOSImage, pmosFinalCleanup } from './pmbootstrap';

console.log("Starting ProLinux build on " + new Date().toLocaleString());

const ARCH_URL = {
    "x64": "https://archive.archlinux.org/iso/2023.03.01/archlinux-bootstrap-x86_64.tar.gz",
    "arm64": "http://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz"
}

let PROLINUX_VARIANT = "mobile"
let PROLINUX_CHANNEL = "nightly"

async function cleanup() {
    console.log("Cleaning up...");
    exec(`sudo umount -R ${ROOTFS_DIR}`);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("Build dirs: " + BUILD_DIR + ", " + ROOTFS_DIR + ", " + FILES_DIR);
    console.log("Platform arch: " + arch);
    if(TARGET_DEVICE === undefined) {
        console.log("No target device specified, exiting");
        process.exit(1);
    }
    console.log("Target device: " + TARGET_DEVICE);

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
    exec(`sudo fallocate -l 42G ${BUILD_DIR}/rootfs.img`);
    exec(`sudo mkfs.ext4 ${BUILD_DIR}/rootfs.img -L pmOS_root`);
    exec(`sudo mount ${BUILD_DIR}/rootfs.img ${ROOTFS_DIR}`);
 
    // extract arch root to rootfs
    exec(`sudo tar -xvf ${BUILD_DIR}/arch.tar.gz -C ${ROOTFS_DIR} --strip-components=1`);  

    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e
        chown root:root /
        echo 'Server = ${arch === "arm64" ? "https://fl.us.mirror.archlinuxarm.org/$arch/$repo" : "https://mirror.rackspace.com/archlinux/$repo/os/$arch"}' > /etc/pacman.d/mirrorlist
        
        sed -i "s/#ParallelDownloads = 5/ParallelDownloads = 5/g" /etc/pacman.conf
        
        yes | pacman-key --init
        yes | pacman-key --populate ${arch === "arm64" ? "archlinuxarm" : "archlinux"}
        pacman -Syu --noconfirm
        pacman -S --noconfirm base-devel git nano neofetch htop wget curl sudo dialog qt6-base qt6-tools polkit libpipewire pipewire libxcvt kwayland libnm networkmanager modemmanager libqalculate distcc ccache gdb
        pacman -S --noconfirm bluez xorg-server xorg-xwayland openssh lightdm lightdm-gtk-greeter mold onboard nodejs npm maliit-keyboard flatpak rsync
        pacman -S --noconfirm appstream-qt libdmtx libwireplumber libxaw lua ttf-hack qrencode wireplumber xorg-xmessage xorg-xsetroot zxing-cpp accountsservice exiv2 lmdb
        pacman -S $(pacman -Ssq qt6-) --noconfirm

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

        sudo flatpak remote-delete flathub
        flatpak remote-add --if-not-exists --user flathub https://flathub.org/repo/flathub.flatpakrepo

        sleep 2
EOF`);

    // merge FILES_DIR/layout into rootfs
    console.log("Merging files from " + FILES_DIR + "/layout into " + ROOTFS_DIR);
    exec(`sudo rsync -a ${FILES_DIR}/layout/ ${ROOTFS_DIR}/`);

    exec(`mkdir -pv ${BUILD_DIR}/cache`);
    exec(`mkdir -pv ${BUILD_DIR}/cache-src`);
    // mount cache folder into rootfs /home/user/.cache
    exec(`sudo mount --bind ${BUILD_DIR}/cache ${ROOTFS_DIR}/home/user/.cache`);
    exec(`sudo mount --bind ${BUILD_DIR}/cache-src ${ROOTFS_DIR}/opt/kde/src`);

    /* ------------- ProLinuxD ------------- */
    exec(`
        set -e
        pwd
        pushd .
            cd ${__dirname}/../ocs2-prolinuxd
            npm ci
            npm run build
            sudo mkdir -pv ${ROOTFS_DIR}/opt/prolinuxd
            sudo cp -rv dist/* ${ROOTFS_DIR}/opt/prolinuxd/
            sudo cp -v distro-files/plctl ${ROOTFS_DIR}/usr/sbin/
        popd
    `);
    
    /* ------------- kdesrc-build ------------- */

    const exportEnv = (arch === "arm64") ? [
        "export CC='ccache distcc'",
        "export CXX='ccache distcc g++'",
        "export DISTCC_HOSTS='192.168.11.138/20'",
    ] : [
        "export CC='ccache gcc'",
        "export CXX='ccache g++'",
    ]

    // @ts-ignore
    const checkoutBranches: [[string, string]] = [
        //["kio", "076337fd"]
        //["kwin", "master"]
    ]

    //const packagesToBuild = "kcmutils plasma5support kirigami-addons plasma-mobile plasma-pa plasma-nm qqc2-breeze-style"
    const packagesToBuild = "extra-cmake-modules kcoreaddons ki18n kconfig plasma-wayland-protocols karchive kdoctools kwidgetsaddons polkit-qt-1 kcodecs kauth kguiaddons kwindowsystem kconfigwidgets kdbusaddons kcrash kiconthemes kcompletion kitemviews sonnet kglobalaccel kservice ktextwidgets gpgme qca knotifications kxmlgui kbookmarks kjobwidgets kwallet solid kactivities kpackage kcmutils kio kirigami kdeclarative kwayland kidletime oxygen-icons5 breeze-icons kparts syntax-highlighting kdnssd kitemmodels ktexteditor kunitconversion threadweaver attica kcmutils plasma-framework syndication knewstuff frameworkintegration kdecoration layer-shell-qt libkscreen poppler krunner breeze kscreenlocker libqaccessibilityclient zxing-cpp phonon kfilemetadata kpty networkmanager-qt kpipewire kwin libkexiv2 selenium-webdriver-at-spi baloo kactivities-stats kded kdesu kholidays knotifyconfig kpeople kquickcharts modemmanager-qt prison libksysguard plasma-nano kuserfeedback kirigami-addons plasma5support plasma-workspace bluez-qt milou plasma-mobile plasma-nm plasma-pa qqc2-breeze-style plasma-settings qmlkonsole kactivitymanagerd ksystemstats qqc2-desktop-style"

    // setup user
    // todo remove ssh-keygen -A from here
    if(process.env.KDE_CACHE === "true") {
        console.log("Using cached KDE build");
        exec(`sudo mkdir -pv ${ROOTFS_DIR}/opt/kde/ && sudo tar -xvf ${BUILD_DIR}/kde-cache.tar.gz -C ${ROOTFS_DIR}/opt/kde/`);
    } else {
        //exec(`sudo mkdir -pv ${ROOTFS_DIR}/usr/include/libkwineffects && sudo tar xvf ${FILES_DIR}/tmp-kwin-include.tar.gz -C ${ROOTFS_DIR}/usr/include/libkwineffects/`); // todo temp: remove this eventually
        exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
            set -e
            chown -R user:user /home/user
            mkdir -pv /opt/kde
            chown -R user:user /opt/kde
            ${arch === "arm64" ? 'ln -s /usr/bin/aarch64-unknown-linux-gnu-g++ "/usr/bin/ distcc g++"' : ''}
            ${arch === "x64" ? 'ln -s /usr/bin/g++ "/usr/bin/ g++"' : ''}
            sudo -u user bash << EOFSU
                set -e
                whoami
                ${exportEnv.join("; ")}
                cd /opt/kde
                mkdir -p /opt/kde/src
                cd /opt/kde/src
                rm -rf kdesrc-build
                git clone https://invent.kde.org/sdk/kdesrc-build.git
                cd kdesrc-build
                ./kdesrc-build --version
                yes | ./kdesrc-build --initial-setup
                ./kdesrc-build --metadata-only
                ./kdesrc-build --src-only ${packagesToBuild}
                ${packagesToBuild.split(" ").map((p) => `find /opt/kde/src/${p} -name CMakeLists.txt -exec sed -i '1i include_directories(/opt/kde/usr/include)' {} \\;`).join("; ")}
                ${packagesToBuild.split(" ").map((p) => `find /opt/kde/src/${p} -name CMakeLists.txt -exec sed -i '1i include_directories(/opt/kde/usr/include/KF6)' {} \\;`).join("; ")}
                ${checkoutBranches.map(([repo, branch]) => `cd /opt/kde/src/${repo} && git checkout ${branch} && cd /opt/kde/src/kdesrc-build`).join("; ")}
                ${packagesToBuild.split(" ").map((p, i, a) => `mold -run ./kdesrc-build --stop-on-failure --no-include-dependencies --no-src ${p}; echo "-- ✅ Built ${i} of ${a.length}!"`).join("; ")}
EOFSU
            sleep 2
EOF`);
        exec(`sudo tar -czvf ${BUILD_DIR}/kde-cache.tar.gz -C ${ROOTFS_DIR}/opt/kde/ .`);
    }

    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e
        mkdir -pv /usr/share/xsessions/ /usr/share/wayland-sessions/ /etc/dbus-1/
        /opt/kde/build/plasma-workspace/login-sessions/install-sessions.sh
        /opt/kde/build/plasma-mobile/bin/install-sessions.sh
        ssh-keygen -A
        systemctl enable NetworkManager
        systemctl enable sshd
        systemctl enable prolinux-setup
        systemctl enable prolinuxd
        systemctl enable lightdm

        mkdir -pv /opt/build-info
        echo "Sineware ProLinux image built on $(date)" >> /opt/build-info/prolinux-info.txt
        pacman -Q >> /opt/build-info/prolinux-sbom.txt
        ls /opt/kde/build/ >> /opt/build-info/prolinux-sbom.txt
EOF`);

    // unmount cache folder
    exec(`sudo umount ${ROOTFS_DIR}/home/user/.cache`);
    exec(`sudo rm -rf ${BUILD_DIR}/home/user/.cache`);
    exec(`sudo umount ${ROOTFS_DIR}/opt/kde/src`);

    // drop to shell
    if(process.env.DEBUG === "true") {
        console.log("Debug shell:");
        exec(`sudo arch-chroot ${ROOTFS_DIR}`);
    }

    // Add pmos device /lib/modules and /usr/lib/firmware
    console.log("Adding pmos device modules and firmware");
    let kernel = "";
    if(TARGET_DEVICE === "tablet-x64uefi") {
        kernel = "edge";
    }
    // @ts-ignore
    genPMOSImage(TARGET_DEVICE, kernel);

    console.log("Stripping files from RootFS");
    exec(`
        sudo rm -rf ${ROOTFS_DIR}/opt/kde/build/*
        sudo rm -rf ${ROOTFS_DIR}/opt/kde/src/*
        sudo rm -rf ${ROOTFS_DIR}/var/cache/pacman/pkg/*
        sudo rm -rf ${ROOTFS_DIR}/opt/kde/usr/share/kservices6/searchproviders/*
        sudo rm -rf ${ROOTFS_DIR}/usr/share/kservices5/searchproviders/*
    `);

    // Create squashfs from root
    exec(`sudo rm -rf ${OUTPUT_DIR}/*`);
    exec(`mkdir -pv ${OUTPUT_DIR} && sudo mksquashfs ${ROOTFS_DIR} ${OUTPUT_DIR}/prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.squish`);

    // Format and place files into rootfs
    exec(`
        sudo mkfs.ext4 /dev/disk/by-label/pmOS_root -F -L pmOS_root
        sudo mount /dev/disk/by-label/pmOS_root ${BUILD_DIR}/pmos_root_mnt
        sudo rsync -ah --progress ${OUTPUT_DIR}/prolinux-root-${PROLINUX_VARIANT}-${PROLINUX_CHANNEL}.squish ${BUILD_DIR}/pmos_root_mnt/prolinux_a.squish
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/squishroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/persistroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/workdir
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/oroot
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/data
        sudo cp -v ${FILES_DIR}/prolinux.toml ${BUILD_DIR}/pmos_root_mnt/data/prolinux.toml

        # pmos init checks this to see if root was mounted
        sudo mkdir -pv ${BUILD_DIR}/pmos_root_mnt/usr
        
        sudo umount /dev/disk/by-label/pmOS_root
        sync
    `);

    pmosFinalCleanup();

    exec(`
        sudo cp -v /tmp/postmarketOS-export/*.img ${OUTPUT_DIR}
    `);

    await sleep(2000);
    await cleanup();
}

try {
    main();
} catch (e) {
    console.error(e);
    cleanup();
}
import exec from "../../helpers/exec";
import { BUILD_DIR, ROOTFS_DIR, OUTPUT_DIR, FILES_DIR, arch, TARGET_DEVICE, PROLINUX_CHANNEL, PROLINUX_VARIANT } from '../../helpers/consts';


export async function buildMobileDev() {
    const exportEnv = (arch === "arm64") ? [
        //"export CC='ccache distcc'",
        //"export CXX='ccache distcc g++'",
        //"export DISTCC_HOSTS='192.168.11.138/20'",
        //"export CC='ccache gcc'",
        //"export CXX='ccache g++'",
        "export CMAKE_CXX_COMPILER_LAUNCHER=ccache",
        `export LDFLAGS="-Wl,--copy-dt-needed-entries"`
    ] : [
        //"export CC='ccache gcc'",
        //"export CXX='ccache g++'",
        "export CMAKE_CXX_COMPILER_LAUNCHER=ccache",
        `export LDFLAGS="-Wl,--copy-dt-needed-entries"`
    ]

    // @ts-ignore
    const checkoutBranches: [[string, string]] = [
        //["kio", "076337fd"]
        //["kwin", "19672bc8"]
        //["plasma-nm", "22377cf6"]
        //["knewstuff", "ec498e9"]
        ["plasma-integration", "work/devinlin/flickdeceleration"],    
    ]

    const packageList = [
        "extra-cmake-modules",
        "kcoreaddons",
        "ki18n",
        "kconfig",
        "plasma-wayland-protocols",
        "karchive",
        "kdoctools",
        "kwidgetsaddons",
        "polkit-qt-1",
        "kwindowsystem",
        "kcodecs",
        "kauth",
        "kguiaddons",
        "kcolorscheme",
        "kconfigwidgets",
        "kdbusaddons",
        "kcrash",
        "kiconthemes",
        "kcompletion",
        "kitemviews",
        "sonnet",
        "kglobalaccel",
        "kservice",
        "ktextwidgets",
        "qca",
        "knotifications",
        "kxmlgui",
        "kbookmarks",
        "kjobwidgets",
        "kwallet",
        "kwallet-pam",
        "solid",
        //"kactivities",
        "plasma-activities", // kactivities
        "kpackage",
        "kio",
        "kcmutils",
        "kirigami",
        "kdeclarative",
        "kwayland",
        "kidletime",
        "oxygen-icons",
        "kparts",
        "syntax-highlighting",
        "kdnssd",
        "kitemmodels",
        "ktexteditor",
        "kunitconversion",
        "threadweaver",
        "attica",
        "ksvg",
        //"plasma-framework",
        "libplasma", // plasma-framework
        "syndication",
        "knewstuff",
        "frameworkintegration",
        "kdecoration",
        "layer-shell-qt",
        "libkscreen",
        "poppler",
        "krunner",
        "breeze",
        "kscreenlocker",
        "libqaccessibilityclient",
        "phonon",
        "kfilemetadata",
        "kpty",
        "networkmanager-qt",
        "kpipewire",
        "kglobalacceld",
        "wayland-protocols",
        "kwin",
        "libkexiv2",
        "selenium-webdriver-at-spi",
        "baloo",
        "plasma-activities-stats", //"kactivities-stats",
        "kded",
        "kdesu",
        "kholidays",
        "knotifyconfig",
        "kcontacts",
        "kpeople",
        "kquickcharts",
        "modemmanager-qt",
        "prison",
        "libksysguard",
        "plasma-nano",
        "kuserfeedback",
        "kirigami-addons",
        "plasma5support",
        "kstatusnotifieritem",
        "plasma-workspace",
        "bluez-qt",
        "milou",
        "plasma-mobile",
        "plasma-nm",
        "plasma-pa",
        "qqc2-breeze-style",
        "plasma-settings",
        "kactivitymanagerd",
        "ksystemstats",
        "qqc2-desktop-style",
        "kscreen",
        "powerdevil",
        "plasma-desktop",
        "bluedevil",
        "plasma-integration",
        "breeze-icons",
        //"konsole",
        "qmlkonsole",
        "purpose",
        "futuresql",
        "kquickimageeditor",
        "angelfish",
        "kclock",
        "kweathercore",
        "extragear/utils/kweather",
        "kalk",
        "appstream",
        "discover",
        "polkit-kde-agent-1",
        "kde-cli-tools",
        "xdg-desktop-portal-kde",
        "kmoretools",
        "dolphin",
        "alligator",
        "elisa",
        "kasts",
        "keysmith",
        "koko",
        "mpvqt",
        "tokodon",
        "spectacle",
        "plasma-dialer",
        "spacebar",
        "krecorder"
    ];
    const packagesToBuild = packageList.join(" ");

    if(process.env.KDE_CACHE === "true") {
        console.log("Using cached KDE build");
        exec(`sudo mkdir -pv ${ROOTFS_DIR}/opt/kde/ && sudo tar --exclude='src' -xvf ${BUILD_DIR}/kde-cache.tar -C ${ROOTFS_DIR}/opt/kde/`);
    } else {
        exec(`mkdir -pv ${BUILD_DIR}/cache`);
        exec(`mkdir -pv ${BUILD_DIR}/cache-src`);
        // mount cache folder into rootfs /home/user/.cache
        exec(`sudo mount --bind ${BUILD_DIR}/cache ${ROOTFS_DIR}/home/user/.cache`);
        exec(`sudo mount --bind ${BUILD_DIR}/cache-src ${ROOTFS_DIR}/opt/kde/src`);
        
        exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
            set -e
            chown -R user:user /home/user
            mkdir -pv /opt/kde
            chown -R user:user /opt/kde
            ${arch === "arm64" ? 'ln -s /usr/bin/aarch64-unknown-linux-gnu-g++ "/usr/bin/ distcc g++"' : ''}
            ${arch === "arm64" ? 'ln -s /usr/bin/aarch64-unknown-linux-gnu-g++ "/usr/bin/ g++"' : ''}
            ${arch === "arm64" ? 'pacman --noconfirm -U http://fl.us.mirror.archlinuxarm.org/aarch64/extra/python-dulwich-0.21.7-1-aarch64.pkg.tar.xz' : '' }
            ${arch === "x64" ? 'ln -s /usr/bin/g++ "/usr/bin/ g++"' : ''}
            sudo -u user bash << EOFSU
                set -e
                whoami
                ${exportEnv.join("; ")}
                export CCACHE_LOGFILE=/home/user/.cache/ccache.log
                alias pacman="pacman --needed"
                
                sudo pacman --noconfirm -S --needed perl-json-xs

                cd /opt/kde

                git config --global --add url.http://invent.kde.org/.insteadOf kde:
                git config --global --add url.ssh://git@invent.kde.org/.pushInsteadOf kde:

                mkdir -p /opt/kde/src
                cd /opt/kde/src
                rm -rf kdesrc-build
                git clone https://invent.kde.org/sdk/kdesrc-build.git
                cd kdesrc-build
                ./kdesrc-build --version
                yes | ./kdesrc-build --initial-setup
                ./kdesrc-build --metadata-only
                ./kdesrc-build --src-only ${packagesToBuild}
                
                ${checkoutBranches.map(([repo, branch]) => `cd /opt/kde/src/${repo} && git checkout ${branch} && git pull --rebase && cd /opt/kde/src/kdesrc-build`).join("; ")}
                ${packagesToBuild.split(" ").map((p, i, a) => `./kdesrc-build --stop-on-failure --no-include-dependencies --no-src ${p}; echo "-- ✅ Built ${i} of ${a.length}!"`).join("; ")}
                
EOFSU
            sleep 2
EOF`);
        exec(`sudo tar --exclude='src' -cvf ${BUILD_DIR}/kde-cache.tar -C ${ROOTFS_DIR}/opt/kde/ .`);
    } /* end of kde-cache else */

    // ${packagesToBuild.split(" ").map((p) => `find /opt/kde/src/${p} -name CMakeLists.txt -exec sed -i '1i include_directories(/opt/kde/usr/include)' {} \\;`).join("; ")}
    // ${packagesToBuild.split(" ").map((p) => `find /opt/kde/src/${p} -name CMakeLists.txt -exec sed -i '1i include_directories(/opt/kde/usr/include/KF6)' {} \\;`).join("; ")}
    
    exec(`sudo arch-chroot ${ROOTFS_DIR} /bin/bash -x <<'EOF'
        set -e
        mkdir -pv /usr/share/xsessions/ /usr/share/wayland-sessions/ /etc/dbus-1/
        /opt/kde/build/plasma-workspace/login-sessions/install-sessions.sh
        /opt/kde/build/plasma-mobile/bin/install-sessions.sh

        echo "auth            optional        /opt/kde/usr/lib/security/pam_kwallet5.so" >> /etc/pam.d/login
        echo "session         optional        /opt/kde/usr/lib/security/pam_kwallet5.so force_run" >> /etc/pam.d/login

        echo 'export XDG_DATA_DIRS=/home/user/.local/share/flatpak/exports/share:$XDG_DATA_DIRS' >> /opt/kde/usr/lib/libexec/plasma-dev-prefix.sh

        # Workaround plasmaphonedialer absolute path in .desktop file
        ln -s /opt/kde/usr/bin/plasmaphonedialer /usr/bin/plasmaphonedialer

        systemctl enable plasma-mobile
        systemctl enable bluetooth

        ${arch === "arm64" ? `echo "Installing packages from DanctNIX"
            echo "[danctnix]" >> /etc/pacman.conf
            echo 'Server = https://archmobile.mirror.danctnix.org/$repo/$arch/' >> /etc/pacman.conf

            pacman -Sy --noconfirm

            pacman-key -r 29DF2D441A1BEDD7 && sudo pacman-key --lsign-key 29DF2D441A1BEDD7
            pacman -S --noconfirm danctnix-keyring
            yes | pacman-key --populate danctnix

            # PinePhone EG25 Modem
            pacman -S --noconfirm eg25-manager
            # PinePhone Firmware
            pacman -S --noconfirm rtl8723bt-firmware anx7688-firmware ov5640-firmware

            # Pinephone Pro Firmware
            pacman -S --noconfirm brcm-firmware alsa-ucm-pinephonepro` : ''}

        echo "Compiling QMLTermWidget"
        cd /tmp
        git clone https://invent.kde.org/jbbgameich/qmltermwidget.git
        cd qmltermwidget
        cmake -DCMAKE_PREFIX_PATH=/opt/kde/usr/ -DQT_MAJOR_VERSION=6 -DCMAKE_CXX_COMPILER_LAUNCHER=ccache -B build && cmake --build build
        sudo cmake --install build
        cd ..
EOF`);

    // unmount cache folder
    exec(`sudo umount ${ROOTFS_DIR}/home/user/.cache || true`);
    exec(`sudo rm -rf ${BUILD_DIR}/home/user/.cache`);
    exec(`sudo umount ${ROOTFS_DIR}/opt/kde/src || true`);
}

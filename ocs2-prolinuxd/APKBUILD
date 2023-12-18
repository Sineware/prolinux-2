pkgname=prolinuxd
pkgver=1.0.0_git$GIT_VERNUM
pkgrel=0
pkgdesc="Sineware Cloud Daemon for ProLinux Plasma Mobile Nightly"
arch="all !ppc64le !s390x !armhf !riscv64"
url="https://sineware.ca/"
license="GPL-2.0"
depends="
	nodejs
    bash
	"
makedepends="
    nodejs
    npm
    bash
    git
	"
source="https://github.com/Sineware/ocs2-prolinuxd/archive/refs/heads/main.zip"
options="net !fhs"

build() {
    npm ci
	npm run build
}

package() {
    mkdir -p "$pkgdir/opt/prolinuxd"
    mkdir -p "$pkgdir/etc/init.d"
    mkdir -p "$pkgdir/usr/share/applications"
    mkdir -p "$pkgdir/usr/sbin"
    cp -r dist/* "$pkgdir/opt/prolinuxd/"

    cp distro-files/prolinuxd "$pkgdir/opt/prolinuxd/"
    cp distro-files/prolinuxd.initd "$pkgdir/etc/init.d/prolinuxd"
    cp distro-files/prolinux.toml "$pkgdir/opt/prolinuxd/prolinux-default.toml"
    cp distro-files/session-wrapper.desktop "$pkgdir/opt/prolinuxd/"
    cp distro-files/app-icon.png "$pkgdir/opt/prolinuxd/"

    cp distro-files/prolinux-config.desktop "$pkgdir/usr/share/applications/"
    cp distro-files/plctl "$pkgdir/usr/sbin/"
}
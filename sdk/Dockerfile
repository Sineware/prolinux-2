FROM archlinux:latest
#ADD ./staging/prolinux-root-mobile-dev.tar /

RUN pacman-key --init && pacman-key --populate archlinux && pacman -Syy --noconfirm archlinux-keyring && pacman -Syyu --noconfirm && \
    pacman -S --noconfirm \
    base-devel \
    git \
    sudo \
    vim \
    wget \
    which \
    code \
    cloud-utils \
    pmbootstrap \
    arch-install-scripts \
    android-tools \
    pigz \
    zsync \
    nodejs \ 
    npm \
    aarch64-linux-gnu-gcc \
    distcc \
    rsync \
    parted \
    squashfs-tools \
    python-setuptools \
    dosfstools \
    e2fsprogs \
    && \
    pacman -Scc --noconfirm

# Symlink all aarch64-linux-gnu-* to aarch64-unknown-linux-gnu-*  so cross compilation works
RUN cd /usr/bin && \
    for f in aarch64-linux-gnu-*; do ln -s $f aarch64-unknown-linux-gnu-${f#aarch64-linux-gnu-}; done

RUN useradd -m -G wheel user
RUN echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
USER user
WORKDIR /home/user

# Install x86_64-linux-musl-native to /opt
RUN wget http://musl.cc/x86_64-linux-musl-native.tgz && \
    sudo tar -xvf x86_64-linux-musl-native.tgz -C /opt && \
    rm x86_64-linux-musl-native.tgz


# Install https://aur.archlinux.org/packages/abootimg
RUN git clone https://aur.archlinux.org/abootimg.git && \
    cd abootimg && \
    makepkg -si --noconfirm && \
    cd .. && \
    rm -rf abootimg

# From git

# Follow this section if your Linux distribution doesn't have pmbootstrap packaged, or its version of pmbootstrap is too old, or you would like to change the code. Run the following to clone and install pmbootstrap from git.

# $ git clone --depth=1 https://gitlab.com/postmarketOS/pmbootstrap.git
# $ mkdir -p ~/.local/bin
# $ ln -s "$PWD/pmbootstrap/pmbootstrap.py" ~/.local/bin/pmbootstrap
# $ pmbootstrap --version
# 2.1.0

# If this returns something like pmbootstrap: command not found instead of a version number, ensure that ~/.local/bin is in your PATH. For example by adding the following to your ~/.profile (zsh: ~/.zprofile) followed by source ~/.profile to update your environment

# PATH="$HOME/.local/bin:$PATH"

RUN git clone --depth=1 https://gitlab.com/postmarketOS/pmbootstrap.git && \
    mkdir -p ~/.local/bin && \
    ln -s "$PWD/pmbootstrap/pmbootstrap.py" ~/.local/bin/pmbootstrap && \
    pmbootstrap --version

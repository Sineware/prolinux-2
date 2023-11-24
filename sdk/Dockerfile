FROM archlinux:latest
#ADD ./staging/prolinux-root-mobile-dev.tar /

RUN pacman -Syyu --noconfirm && \
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
    && \
    pacman -Scc --noconfirm

# Symlink all aarch64-linux-gnu-* to aarch64-unknown-linux-gnu-*  so cross compilation works
RUN cd /usr/bin && \
    for f in aarch64-linux-gnu-*; do ln -s $f aarch64-unknown-linux-gnu-${f#aarch64-linux-gnu-}; done

RUN useradd -m -G wheel user
RUN echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
USER user
WORKDIR /home/user

# Install https://aur.archlinux.org/packages/abootimg
RUN git clone https://aur.archlinux.org/abootimg.git && \
    cd abootimg && \
    makepkg -si --noconfirm && \
    cd .. && \
    rm -rf abootimg
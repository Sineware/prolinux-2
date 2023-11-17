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
    && \
    pacman -Scc --noconfirm

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
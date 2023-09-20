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
    && \
    pacman -Scc --noconfirm
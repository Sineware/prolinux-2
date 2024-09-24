FROM python:3.12-slim

RUN apt update && apt install -y \
    kmod busybox util-linux
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN mkdir -pv /sysroot /tmproot 

COPY init-wrapper.sh /init
COPY init.py /init.py
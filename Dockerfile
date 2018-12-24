FROM registry.cn-hangzhou.aliyuncs.com/findstr-vps/silly:latest
COPY server /server
WORKDIR /
#ENTRYPOINT ["/bin/sh"]
CMD ["server/helperd.conf"]"

FROM node:24-alpine

WORKDIR /home/node

ADD entrypoint.sh /entrypoint.sh

ARG mainsail_channel=rc

ENV PNPM_HOME=/home/node/.pnpm/bin
ENV CARGO_HOME=/home/node/.cargo
ENV PATH="${PATH}:${PNPM_HOME}:${CARGO_HOME}/bin"

RUN apk add --no-cache --virtual .build-deps make gcc g++ python3 py3-setuptools git \
    && apk add --no-cache bash sudo git openntpd openssl jemalloc curl \
    && echo "servers pool.ntp.org" > /etc/ntpd.conf \
    && echo "servers time.google.com" >> /etc/ntpd.conf \
    && npm install -g npm@latest \
    && su node -c "curl https://sh.rustup.rs -sSf | sh -s -- -y" \
    && su node -c "npm install --prefix=/home/node/.pnpm -g pnpm@10.34.3" \
    && su node -c "pnpm add -g @mainsail/core@${mainsail_channel} --allow-build=@mainsail/evm --allow-build=@chainsafe/blst --allow-build=bcrypto --allow-build=better-sqlite3 --allow-build=bstring --allow-build=lmdb --allow-build=msgpackr-extract --allow-build=nsfw --allow-build=protobufjs" \
    && su node -c "export PNPM_HOME=/home/node/.pnpm/bin" \
    && su node -c "pnpm store prune" \
    && su node -c "rm -rf ~/.cache/node-gyp" \
    && su node -c "rustup self uninstall -y" \
    && apk del .build-deps \
    && echo 'node ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Preload jemalloc so the node process and its worker threads use it directly, and
# bin/run.js skips its detect-and-re-exec fallback (~400ms cold-start saving).
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2

USER node
ENTRYPOINT ["bash", "-c", "/entrypoint.sh \"$@\"", "--"]

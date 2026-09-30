FROM node:24-alpine

WORKDIR /home/node

ADD entrypoint.sh /entrypoint.sh

ENV PNPM_HOME=/home/node/.pnpm
ENV CARGO_HOME=/home/node/.cargo
ENV PATH="${PATH}:${PNPM_HOME}/bin:${CARGO_HOME}/bin"

RUN apk add --no-cache make gcc g++ python3 py3-setuptools git bash sudo git openntpd openssl jemalloc curl jq \
    && echo "servers pool.ntp.org" > /etc/ntpd.conf \
    && echo "servers time.google.com" >> /etc/ntpd.conf \
    && npm install -g npm@latest \
    && su node -c "npm config set allow-scripts=pnpm --location=user" \
    && su node -c "curl https://sh.rustup.rs -sSf | sh -s -- -y" \
    && su node -c "npm install --prefix=/home/node/.pnpm -g pnpm" \
    && su node -c "pnpm config set --global enable-global-virtual-store false" \
    && su node -c "pnpm config set --global minimumReleaseAge 0" \
    && su node -c "export PNPM_HOME=/home/node/.pnpm/bin" \
    && su node -c "pnpm add -g lerna --allow-build=nx" \
    && su node -c "pnpm store prune" \
    && su node -c "rm -rf ~/.cache/node-gyp" \
    && su node -c "rustup self uninstall -y" \
    && echo 'node ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER node
ENTRYPOINT ["bash", "-c", "/entrypoint.sh \"$@\"", "--"]

FROM node:22-alpine

WORKDIR /home/node

ADD entrypoint.sh /entrypoint.sh

ENV PNPM_HOME=/home/node/.pnpm/bin
ENV PATH="${PATH}:${PNPM_HOME}"
ENV PATH="/home/node/.cargo/bin:${PATH}"

RUN apk add --no-cache make gcc g++ python3 py3-setuptools git bash sudo git openntpd openssl jemalloc curl jq \
    && echo "servers pool.ntp.org" > /etc/ntpd.conf \
    && echo "servers time.google.com" >> /etc/ntpd.conf \
    && npm install -g npm@latest \
    && su node -c "npm install --prefix=/home/node/.pnpm -g pnpm" \
    && su node -c "export PNPM_HOME=/home/node/.pnpm/bin" \
    && su node -c "pnpm add -g lerna --allow-build=nx" \
    && su node -c "curl https://sh.rustup.rs -sSf | bash -s -- -y" \
    && su node -c "rm -rf ~/.cache/node-gyp" \
    && echo 'node ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER node
ENTRYPOINT ["bash", "-c", "/entrypoint.sh \"$@\"", "--"]

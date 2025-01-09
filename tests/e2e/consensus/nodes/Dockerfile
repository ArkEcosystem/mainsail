FROM node:20

WORKDIR /home/node

ENV PNPM_HOME=/home/node/.pnpm/bin
ENV PATH="${PATH}:${PNPM_HOME}"

RUN apt-get update && apt-get install build-essential -y \
    && apt-get install libjemalloc2 \
    && npm install -g npm@latest \
    && su node -c "npm install --prefix=/home/node/.pnpm -g pnpm" \
    && su node -c "export PNPM_HOME=/home/node/.pnpm/bin"

USER node

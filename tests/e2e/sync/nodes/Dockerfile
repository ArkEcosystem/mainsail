FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
	curl \
	gnupg \
	build-essential \
	libjemalloc2

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get install -y nodejs

WORKDIR /home/ubuntu

ENV PNPM_HOME=/home/ubuntu/.pnpm/bin
ENV PATH="${PATH}:${PNPM_HOME}"

RUN npm install -g npm@latest \
	&& su ubuntu -c "npm install --prefix=/home/ubuntu/.pnpm -g pnpm" \
	&& su ubuntu -c "export PNPM_HOME=/home/ubuntu/.pnpm/bin"

USER ubuntu

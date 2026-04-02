#!/usr/bin/env bash

# To switch the container CLI to Podman instead of Docker, run:
#     export CONTAINER_CLI=podman
# To return to auto-detection mode (Docker or Podman), run:
#     unset CONTAINER_CLI
# By default, Docker will have priority over Podman if both are installed.

if [ -z "$CONTAINER_CLI" ]; then
    if command -v docker >/dev/null 2>&1; then
        CONTAINER_CLI=docker
    elif command -v podman >/dev/null 2>&1; then
        CONTAINER_CLI=podman
    else
        echo "Error: Docker or podman not found."
        exit 1
    fi
fi

$CONTAINER_CLI "$@"
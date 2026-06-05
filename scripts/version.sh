#!/usr/bin/env bash

set -e

# Run the TypeScript version bump, forwarding any arguments (e.g. major/minor/patch).
pnpm run version:ts "$@"

# Prepare the EVM native package release.
pnpm run version:evm

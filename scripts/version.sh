#!/usr/bin/env bash

set -e

# Run the TypeScript version bump, forwarding any arguments (e.g. major/minor/patch).
npx lerna version --no-git-tag-version --yes "$@"

# Prepare the EVM native package release.
npx lerna run release:prepare --scope=@mainsail/evm

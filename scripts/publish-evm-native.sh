#!/usr/bin/env bash
set -euo pipefail

# Publishes the EVM native platform packages (@mainsail/evm-*) to npm.
#
# Run this BEFORE `pnpm run release`. The platform packages in npm/*/ already carry the release
# version (`napi version` bumps them during `lerna version`, see scripts/version.sh) and contain the
# prebuilt binaries downloaded from the build jobs (`pnpm artifacts`). Each one is published with
# `pnpm publish`, forwarding every flag passed on the command line. `napi prepublish` is not used:
# it would publish them with a bare `npm publish` (no --tag), which npm rejects for prerelease
# versions, and pnpm strips npm_config_* from the lifecycle-script env so a dist-tag cannot be
# injected that way. The main package's optionalDependencies on these packages are `workspace:*`,
# which pnpm resolves to the exact version when `pnpm run release` publishes @mainsail/evm.
#
# Usage:
#   pnpm run release:native -- --tag=evm --publish-branch=evm     --no-git-checks
#   pnpm run release:native -- --tag=rc  --publish-branch=develop --no-git-checks

cd "$(dirname "${BASH_SOURCE[0]}")/../packages/evm"

# `pnpm run release:native -- <flags>` forwards the literal `--` separator into "$@" as well; drop
# it so the flags reach `pnpm publish` as options instead of being treated as a positional argument.
if [ "${1:-}" = "--" ]; then
	shift
fi

for dir in npm/*/; do
	echo "Publishing ${dir%/} $*"
	(cd "$dir" && pnpm publish --access public "$@")
done

#!/usr/bin/env bash
set -euo pipefail

# Publishes the EVM native platform packages (@mainsail/evm-*) to npm.
#
# Run this BEFORE `pnpm run release`. It first lets napi sync the platform package versions and the
# main package's optionalDependencies (without publishing them or creating a GitHub release), then
# publishes each platform package, forwarding every flag passed on the command line straight to
# `pnpm publish`. `napi prepublish` would otherwise publish them with a bare `npm publish` (no
# --tag), which npm rejects for prerelease versions, and pnpm strips npm_config_* from the
# lifecycle-script env so a dist-tag cannot be injected that way.
#
# Usage:
#   pnpm run release:napi -- --tag=evm --publish-branch=evm     --no-git-checks
#   pnpm run release:napi -- --tag=rc  --publish-branch=develop --no-git-checks

cd "$(dirname "${BASH_SOURCE[0]}")/../packages/evm"

# `pnpm run release:napi -- <flags>` forwards the literal `--` separator into "$@" as well; drop it
# so the flags reach `pnpm publish` as options instead of being treated as a positional argument.
if [ "${1:-}" = "--" ]; then
	shift
fi

# Sync versions + optionalDependencies only; we publish the platform packages ourselves below.
pnpm exec napi prepublish -t pnpm --skip-optional-publish --no-gh-release

for dir in npm/*/; do
	echo "Publishing ${dir%/} $*"
	(cd "$dir" && pnpm publish --access public "$@")
done

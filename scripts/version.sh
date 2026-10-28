#!/usr/bin/env bash

set -e

# Bump every package to the requested version, forwarding any arguments (e.g. major/minor/patch or
# an explicit version).
#
# lerna also runs the `version` lifecycle script of @mainsail/evm (`napi version`), which bumps the
# native platform packages in packages/evm/npm/*/package.json to the same version. The
# optionalDependencies on those packages are `workspace:*`, which pnpm resolves to the exact version
# on publish, so nothing else has to be synced here.
#
# Do NOT run `napi prepublish` here: current @napi-rs/cli versions validate that every platform
# package contains its prebuilt .node binary, and those only exist in the CI publish job.
npx lerna version --no-git-tag-version --yes "$@"

# lerna and napi rewrite the manifests they touch with two-space indentation; restore the repo
# formatting (tabs) so the release commit only contains the version changes.
npx prettier --write lerna.json "packages/*/package.json" "packages/evm/npm/*/package.json"

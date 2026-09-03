#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

# `semver` is pinned to 7.8.0. semver 7.8.3 (npm/node-semver#872) stopped adding the "-0" lower
# bound to exact "^0.0.x" caret ranges under `includePrerelease`, so the p2p default
# `minimumVersions: ["^0.0.1"]` no longer matches prerelease builds such as 0.0.1-rc.9. Every peer
# then fails `isValidVersion`, the p2p server answers 400 and hapi-nes drops the socket, leaving nodes
# without peers. Bump once the range/`isValidVersion` logic is made independent of that heuristic.

pnpm --recursive update --latest '!typescript' '!better-sqlite3' '!semver' "$@"
pnpm dedupe

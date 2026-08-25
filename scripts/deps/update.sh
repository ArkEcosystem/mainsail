#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

pnpm --recursive update --latest '!typescript' '!better-sqlite3' "$@"
pnpm dedupe

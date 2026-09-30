#!/usr/bin/env bash
# Rust coverage for packages/evm: unit tests + the evm-service suite run against an
# instrumented addon, merged into a single coverage/lcov.info.
#
# The bindings crate is a napi cdylib whose only cargo-test artifact is an empty
# harness, so `cargo llvm-cov` alone reports it at 0%. The code is actually
# exercised by the evm-service TypeScript suite — but only an instrumented build
# of the addon makes that execution visible to llvm-cov. This script therefore:
#
#   1. runs the Rust unit tests under instrumentation,
#   2. builds an instrumented debug addon and runs the evm-service suite against it,
#   3. emits one merged lcov report covering both.
#
# The release addon is backed up and restored afterwards (even on failure), so
# suites running after this one keep using the fast release build.
set -euo pipefail

cd "$(dirname "$0")/.."
PKG_DIR="$PWD"

# napi builds with an explicit host --target, so test artifacts must land in the
# same triple directory for `cargo llvm-cov report` to find every object file.
TRIPLE="$(rustc -vV | awk '/^host:/{print $2}')"

# Back up the release addon; the instrumented debug build overwrites it.
BACKUP_DIR="$(mktemp -d)"
shopt -s nullglob
ADDONS=(evm.*.node)
if ((${#ADDONS[@]})); then
    cp "${ADDONS[@]}" "$BACKUP_DIR/"
fi

restore_addon() {
    if ((${#ADDONS[@]})); then
        cp "$BACKUP_DIR"/*.node "$PKG_DIR/"
    else
        echo "note: no pre-existing release addon to restore; run 'pnpm run build-napi' to replace the instrumented one." >&2
    fi
    rm -rf "$BACKUP_DIR"
}
trap restore_addon EXIT

# Instrumentation env (RUSTC_WRAPPER instruments workspace crates only;
# LLVM_PROFILE_FILE contains %p so every node/test process writes its own profile).
eval "$(cargo llvm-cov show-env --sh)"
cargo llvm-cov clean --workspace

# 1) Rust unit tests, instrumented.
cargo test --workspace --target "$TRIPLE"

# 2) Instrumented addon + the evm-service suite (the only executable path through bindings).
#    limited-evm.test.ts is excluded: it asserts a wall-clock gated-vs-parallel timing
#    ratio that is meaningless under instrumentation overhead (and its EVM calls are
#    covered by the other suites).
pnpm run build-napi:debug
(cd ../evm-service && pnpm run uvu source '^(?!.*limited-evm).*\.test\.ts$')

# 3) One merged report. SF paths come out absolute in this mode; strip the package
#    prefix so the repo-level lcov merge (create-lcov-report.sh) can prepend
#    "packages/evm/" like it does for every other package.
mkdir -p coverage
cargo llvm-cov report --target "$TRIPLE" --lcov --output-path coverage/lcov.info
sed -i.bak "s|^SF:$PKG_DIR/|SF:|" coverage/lcov.info
rm -f coverage/lcov.info.bak

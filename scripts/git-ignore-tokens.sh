#!/usr/bin/env bash
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
exclude_file="$repo_root/.git/info/exclude"

mkdir -p "$(dirname "$exclude_file")"
touch "$exclude_file"

entries=(
	"ts-force.flag"
	"rs-force.flag"
)

for entry in "${entries[@]}"; do
	if ! grep -Fxq "$entry" "$exclude_file"; then
		printf '%s\n' "$entry" >> "$exclude_file"
	fi
done

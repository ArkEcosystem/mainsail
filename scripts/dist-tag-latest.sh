#!/usr/bin/env bash

for dir in `find ../packages -mindepth 1 -maxdepth 1 -type d | sort -nr`; do
    json=$(<"$dir/package.json")
	# Remove leading/trailing whitespace
	json=$(echo "$json" | tr -d '\n' | tr -d '\r' | sed 's/ //g')
	# Extract name and version
	name=$(echo "$json" | sed 's/.*"name":"\([^"]*\)".*/\1/')
	version=$(echo "$json" | sed 's/.*"version":"\([^"]*\)".*/\1/')
	echo $name@$version

	pnpm dist-tag add $name@$version latest
done

#!/bin/bash

# Output file for the merged result
MERGED_FILE="merged-lcov.info"

# Ensure output directory exists and clear previous file
> "$MERGED_FILE"

# Handle packages/*
for pkg in packages/*; do
  LCOV_IN="$pkg/coverage/lcov.info"

  if [ -f "$LCOV_IN" ]; then
    echo "Merging $LCOV_IN"
    sed "s|^SF:|SF:$pkg/|" "$LCOV_IN" >> "$MERGED_FILE"
  fi
done

# Handle contracts/lcov.info
CONTRACTS_LCOV="contracts/lcov.info"

if [ -f "$CONTRACTS_LCOV" ]; then
  echo "Merging $CONTRACTS_LCOV"
  sed "s|^SF:|SF:contracts/|" "$CONTRACTS_LCOV" >> "$MERGED_FILE"
fi

echo "✅ Merged LCOV written to $MERGED_FILE"

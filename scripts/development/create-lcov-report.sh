#!/bin/bash

# Output file for the merged result
MERGED_FILE="merged-lcov.info"

# Create or empty the merged file
mkdir -p coverage
> "$MERGED_FILE"

# Process each package
for pkg in packages/*; do
  LCOV_IN="$pkg/coverage/lcov.info"
  LCOV_FIXED="$pkg/coverage/lcov-fixed.info"

  if [ -f "$LCOV_IN" ]; then
    echo "Fixing paths in $pkg"
    # Prefix SF paths with the package path and save to fixed file
    sed "s|^SF:|SF:$pkg/|" "$LCOV_IN" > "$LCOV_FIXED"

    # Append to the merged file
    cat "$LCOV_FIXED" >> "$MERGED_FILE"
  fi
done

echo "✅ Merged LCOV written to $MERGED_FILE"

#!/bin/bash

forge coverage --report lcov

LINE_COVERAGE=$(grep -Po 'LF:\K\d+' lcov.info | paste -sd+ - | bc)
COVERED_LINES=$(grep -Po 'LH:\K\d+' lcov.info | paste -sd+ - | bc)
COVERAGE_PERCENT=$(echo "scale=2; ($COVERED_LINES / $LINE_COVERAGE) * 100" | bc)
echo "Total Line Coverage: $COVERAGE_PERCENT%"

MIN_COVERAGE=90 # TODO
if (( $(echo "$COVERAGE_PERCENT < $MIN_COVERAGE" | bc -l) )); then
  echo "Error: Coverage $COVERAGE_PERCENT% is below the minimum threshold of $MIN_COVERAGE%."
  exit 1
else
  echo "Success: Coverage $COVERAGE_PERCENT% meets the minimum threshold of $MIN_COVERAGE%."
fi

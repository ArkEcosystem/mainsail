#!/usr/bin/env bash

for dir in `find packages -mindepth 1 -maxdepth 1 -type d | sort -nr`; do
    cd $dir
    echo $PWD
    ../../node_modules/eslint/bin/eslint.js source/**/*.ts --fix --quiet --config=../../.eslintrc.bash.js
    cd ../..
done

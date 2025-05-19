#!/bin/bash

forge coverage --report lcov
sed -n '/^SF:test\//!p;/^SF:test\//q' lcov.info > filtered-lcov.info
mv filtered-lcov.info lcov.info

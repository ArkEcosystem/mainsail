#!/usr/bin/env bash

TARGET_PROJECT_DIR="$1"

if [[ ! "$1" ]]; then
    echo "Target project is missing.";
    echo "";
    echo "Usage:"
    echo "./scripts/development/link-packages.sh relative-path-to-my-sample-project";
    echo "";
    echo "Example:";
    echo "./scripts/development/link-packages.sh ../my-sample-project";
    exit 1;
fi

echo "Linking packages to ${TARGET_PROJECT_DIR}"

# Ensure path is relative to individual packages
TARGET_PROJECT_DIR=../../$TARGET_PROJECT_DIR

declare -a arr=(
    "container" "contracts" "crypto-address-base58" "crypto-config"
    "crypto-hash-bcrypto" "crypto-key-pair-ecdsa" "crypto-signature-schnorr-secp256k1"
    "crypto-transaction" "crypto-transaction-multi-payment" "crypto-transaction-transfer"
    "crypto-transaction-username-registration" "crypto-transaction-username-resignation" "crypto-transaction-validator-registration"
    "crypto-transaction-validator-resignation" "crypto-transaction-vote" "crypto-validation"
    "fees" "fees-static" "kernel" "utils" "validation"
)

for i in "${arr[@]}"
do
    echo "$i"
    cd "packages/$i"
    echo $PWD
    pnpm link --dir $TARGET_PROJECT_DIR
    cd -
done

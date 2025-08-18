#!/usr/bin/env bash
sudo /usr/sbin/ntpd

if [ "$DB_RESET" = "true" ]; then
    sudo rm -rf /home/node/.local/share/mainsail/core/*	
fi
sudo rm -rf /home/node/.config/mainsail/core/*
sudo rm -rf /home/node/.local/state/mainsail/core/*
sudo chown node:node -R /home/node/.config
sudo chown node:node -R /home/node/.local
SNAP=$(curl -s -L -H "Accept: application/vnd.github+json" "https://api.github.com/repos/ArkEcosystem/mainsail-network-config/contents/testnet/mainsail/"  | grep  compressed | grep download_url | awk '{ print $2 }' | tr -d ",")

if [ "$API" = "true" ]; then
    mainsail config:publish:custom --app="https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/app.json" --peers="https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/peers.json" --crypto="https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/crypto.json" --snapshot=${SNAP} --overwrite 
    mainsail env:set --key=MAINSAIL_API_SYNC_ENABLED --value=true
else
    mainsail config:publish:custom --app="https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/app.json" --peers="https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/peers.json" --crypto="https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/crypto.json" --snapshot=${SNAP} --overwrite
    mainsail env:set --key=MAINSAIL_API_SYNC_ENABLED --value=false
fi

if [ "$MODE" = "validator" ]; then
    BLS=`openssl pkeyutl -decrypt -inkey /run/secrets/bls.key -in /run/secrets/bls.dat 2>/dev/null` 
    BIP39=`openssl pkeyutl -decrypt -inkey /run/secrets/secret.key -in /run/secrets/secret.dat 2>/dev/null` 
    MAINSAIL_VALIDATOR_PASSWORD=`openssl pkeyutl -decrypt -inkey /run/secrets/bip.key -in /run/secrets/bip.dat 2>/dev/null`
    
    # configure
    if [ "$MODE" = "validator" ] && [ -z "$BLS" ] && [ -z "$BIP39" ]; then
        echo "Couldn't find private key, nor passphrase."
        exit 1
    elif [ -n "$BLS" ] && [ -n "$MAINSAIL_VALIDATOR_PASSWORD" ]; then
        mainsail --token=$TOKEN --network=$NETWORK config:forger:bls --privateKey "$BLS"
        echo "Configuring with private key."
    elif [ -n "$BIP39" ] && [ -n "$MAINSAIL_VALIDATOR_PASSWORD" ]; then
	mainsail --token=$TOKEN --network=$NETWORK config:forger:bip39 --bip39 "$BIP39"
	echo "Configuring with passphrase."
    else
	echo "Configuration failed. Please check your logs."
	exit 1
    fi
fi

# relay
if [ "$MODE" = "relay" ]; then
    mainsail --token=$TOKEN --network=$NETWORK core:run
fi

# validator 
if [ "$MODE" = "validator" ] && [ -z "$BLS" ] && [ -z "$BIP39" ]; then
    echo "Couldn't find private key, nor passphrase. Can't run a validator node."
    exit 1
elif [ "$MODE" = "validator" ] && [ -n "$BLS" ] || [ -n "$BIP39" ]; then
    mainsail --token=$TOKEN --network=$NETWORK core:run
else
    echo "Failed to start. Please check your logs."
    exit 1
fi

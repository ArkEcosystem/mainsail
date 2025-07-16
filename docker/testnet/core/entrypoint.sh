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
  SECRET=`openssl pkeyutl -decrypt -inkey /run/secrets/secret.key -in /run/secrets/secret.dat`
  MAINSAIL_FORGER_PASSWORD=`openssl pkeyutl -decrypt -inkey /run/secrets/bip.key -in /run/secrets/bip.dat`

  # configure
  if [ "$MODE" = "validator" ] && [ -z "$SECRET" ] && [ -z "$MAINSAIL_FORGER_PASSWORD" ]; then
    echo "set SECRET and/or MAINSAIL_FORGER_PASWORD if you want to run a forger"
    exit
  elif [ -n "$SECRET" ] && [ -n "$MAINSAIL_FORGER_PASSWORD" ]; then
    mainsail --token=$TOKEN --network=$NETWORK config:forger:bip39 --bip39 "$SECRET"
  fi
fi

# relay
if [[ "$MODE" = "relay" ]]; then
    mainsail --token=$TOKEN --network=$NETWORK core:run
fi

# forging
if [ "$MODE" = "validator" ] && [ -z "$SECRET" ] && [ -z "$MAINSAIL_FORGER_PASSWORD" ]; then
    echo "set SECRET and/or MAINSAIL_FORGER_PASWORD if you want to run a forger"
    exit
elif [ "$MODE" = "validator" ] && [ -n "$SECRET" ] && [ -n "$MAINSAIL_FORGER_PASSWORD" ]; then
    mainsail --token=$TOKEN --network=$NETWORK core:run
fi

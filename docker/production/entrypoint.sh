#!/usr/bin/env bash
sudo /usr/sbin/ntpd

sudo rm -rf /home/node/.config/mainsail/core/*
sudo rm -rf /home/node/.local/state/mainsail/core/*
sudo chown node:node -R /home/node/.config
sudo chown node:node -R /home/node/.local
mainsail config:publish --token=$TOKEN --network=$NETWORK

if [ "$MODE" = "forger" ]; then
  SECRET=`openssl pkeyutl -decrypt -inkey /run/secrets/secret.key -in /run/secrets/secret.dat`
  CORE_FORGER_PASSWORD=`openssl pkeyutl -decrypt -inkey /run/secrets/bip.key -in /run/secrets/bip.dat`

  # configure
  if [ "$MODE" = "forger" ] && [ -z "$SECRET" ] && [ -z "$CORE_FORGER_PASSWORD" ]; then
    echo "set SECRET and/or CORE_FORGER_PASWORD if you want to run a forger"
    exit
  elif [ -n "$SECRET" ] && [ -n "$CORE_FORGER_PASSWORD" ]; then
    mainsail --token=$TOKEN --network=$NETWORK config:forger:bip39 --bip39 "$SECRET"
  fi
fi

# relay
if [[ "$MODE" = "relay" ]]; then
    mainsail --token=$TOKEN --network=$NETWORK core:run
fi

# forging
if [ "$MODE" = "forger" ] && [ -z "$SECRET" ] && [ -z "$CORE_FORGER_PASSWORD" ]; then
    echo "set SECRET and/or CORE_FORGER_PASWORD if you want to run a forger"
    exit
elif [ "$MODE" = "forger" ] && [ -n "$SECRET" ] && [ -n "$CORE_FORGER_PASSWORD" ]; then
    mainsail --token=$TOKEN --network=$NETWORK core:run
fi

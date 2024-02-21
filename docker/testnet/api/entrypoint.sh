#!/usr/bin/env bash
sudo /usr/sbin/ntpd

sudo rm -rf /home/node/.config/mainsail/api/*
sudo rm -rf /home/node/.local/state/mainsail/api/*
sudo rm -rf /home/node/.local/share/mainsail/api/*
sudo chown node:node -R /home/node/.config
mainsail-api config:publish --token=ark --network=testnet --reset
mainsail-api api:run

#!/usr/bin/env bash
sudo /usr/sbin/ntpd

if [ "$DB_RESET" = "true" ]; then
  sudo rm -rf /home/node/.local/share/mainsail/core/*	
fi
sudo rm -rf /home/node/.config/mainsail/core/*
sudo rm -rf /home/node/.local/state/mainsail/core/*
sudo rm -rf /home/node/.config/mainsail/api/*
sudo rm -rf /home/node/.local/state/mainsail/api/*
sudo rm -rf /home/node/.local/share/mainsail/api/*

sudo chown node:node -R /home/node/.config
sudo chown node:node -R /home/node/.local

bash

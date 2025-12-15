#!/bin/sh

MAINSAIL="/mainsail/packages/core/bin/run.js"

SNAP=$(curl -s -L -H "Accept: application/vnd.github+json" "https://api.github.com/repos/ArkEcosystem/mainsail-network-config/contents/testnet/mainsail/" | grep  compressed | grep download_url | awk '{ print $2 }' | tr -d ",")
node $MAINSAIL config:publish:custom --app=file:///mainsail/packages/core/bin/config/devnet/core/app.json --peers=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/peers.json --crypto=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/refs/heads/main/testnet/mainsail/crypto.json --snapshot=${SNAP} --overwrite

node $MAINSAIL env:paths

node $MAINSAIL env:set --key=MAINSAIL_LOG_LEVEL --value=debug
node $MAINSAIL env:set --key=MAINSAIL_P2P_HOST --value=0.0.0.0
node $MAINSAIL env:set --key=MAINSAIL_P2P_PORT --value=4000
node $MAINSAIL env:set --key=MAINSAIL_API_TRANSACTION_POOL_HOST --value=0.0.0.0
node $MAINSAIL env:set --key=MAINSAIL_API_TRANSACTION_POOL_PORT --value=4007
node $MAINSAIL env:set --key=MAINSAIL_API_EVM_HOST --value=0.0.0.0
node $MAINSAIL env:set --key=MAINSAIL_API_EVM_PORT --value=4008
node $MAINSAIL env:set --key=MAINSAIL_API_SYNC_ENABLED --value=true

node $MAINSAIL env:set --key=MAINSAIL_DB_USERNAME --value=test_db
node $MAINSAIL env:set --key=MAINSAIL_DB_PASSWORD --value=password
node $MAINSAIL env:set --key=MAINSAIL_DB_DATABASE --value=test_db
node $MAINSAIL env:set --key=MAINSAIL_DB_PORT --value=5432

node $MAINSAIL core:run 

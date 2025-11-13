#!/bin/sh

MAINSAIL_API="/mainsail/packages/api/bin/run.js"

node $MAINSAIL_API config:publish --reset

node $MAINSAIL_API env:set --key=MAINSAIL_LOG_LEVEL --value=debug
node $MAINSAIL_API env:set --key=MAINSAIL_DB_USERNAME --value=test_db
node $MAINSAIL_API env:set --key=MAINSAIL_DB_PASSWORD --value=password
node $MAINSAIL_API env:set --key=MAINSAIL_DB_DATABASE --value=test_db
node $MAINSAIL_API env:set --key=MAINSAIL_DB_PORT --value=5432

node $MAINSAIL_API api:run

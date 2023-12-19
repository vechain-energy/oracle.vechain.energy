#!/usr/bin/env bash

set -e

if [ -f .env ]; then
    echo "loading previous environment variables from .env"
    set -o allexport; source .env; set +o allexport
else
    echo "generating a new private key"
    PRIVATE_KEY="0x`openssl rand -hex 32`"

    echo "generating an api key protecting your backend"
    API_KEY=`openssl rand -hex 32`
fi

if [ -z "$ORACLE_ADDRESS" ]; then
    echo "deploy gas optimized contract"

    cd contracts
    yarn install > /dev/null
    yarn build
    yarn test

    echo "deployer & reporter is by default the PRIVATE_KEY"
    PRIVATE_KEY="$PRIVATE_KEY" NETWORK=vechain yarn deploy OracleGasOptimized

    echo "storing oracle address in an environment variable"
    ORACLE_ADDRESS=`cat outputs/test/OracleGasOptimized.json | jq -r .address`

    cd ..

    echo "storing all environment variables for later in .env"
    echo "PRIVATE_KEY=$PRIVATE_KEY" > .env
    echo "API_KEY=$API_KEY" >> .env
    echo "ORACLE_ADDRESS=$ORACLE_ADDRESS" >>  .env
fi


echo "starting the reporter in the local environment"
cd reporter

echo "configure secret vars for local environment"
echo "PRIVATE_KEY=$PRIVATE_KEY" > .dev.vars
echo "API_KEY=$API_KEY" >> .dev.vars

if [ ! -d "node_modules" ]; then
    yarn install > /dev/null
    yarn test
fi

echo "delaying a curl request to be executed once the reporter has started"
(sleep 10 && curl -XPOST http://localhost:8787/vet-usd \
-H "X-API-Key: ${API_KEY}" \
-d '
{
    "id":"vet-usd",
    "sources": [
        {
            "url": "https://api.coincap.io/v2/assets/vechain",
            "path": ".data.priceUsd"
        }
    ],
    "heartbeat": 3600,
    "deviationPoints": 100,
    "interval": 60,
    "contracts": [{
        "nodeUrl": "https://node-testnet.vechain.energy",
        "address": "'"$ORACLE_ADDRESS"'",
        "delegationUrl": "https://sponsor-testnet.vechain.energy/by/90"
    }]
}
') &

echo "starting wrangler with the reporter locally"
wrangler dev

cd ..
# Sample Configuration

Each data feed will have a corresponding [Cloudflare Durable Object](https://developers.cloudflare.com/durable-objects/). The `interval` setting determines how often (in seconds) the data from the `sources` is refreshed.

Configuration access is protectd with an API-Key.

Each source should provide a JSON output. The numerical value is retrieved from a specified `path` in the source's output.

## Local Development

Configure `.dev.vars` with:

```yml
PRIVATE_KEY = ""
VEN_API_KEY = ""
API_KEY = ""
```

```shell
yarn install
npx wrangler dev
```

The reporter is now accessable at http://localhost:8787

Configure a test feed:

```shell
curl -XPOST http://localhost:8787/vet-usd \
-H 'X-API-Key: …' \
-d '
{
    "id":"vet-usd",
    "sources": [
        {
            "url": "https://api.coinbase.com/v2/exchange-rates?currency=VET",
            "path": ".data.rates.USD"
        }
    ],
    "heartbeat": 3600,
    "deviationPoints": 100,
    "interval": 60,
    "contract": {
        "nodeUrl": "https://node-testnet.vechain.energy",
        "address": "<CONTRACT_ADDRESS>"
    }
}
'
```


## Deployment

Deploy like a regular Cloudflare worker:

```shell
wrangler deploy
```

Make sure to correctly configure the required secrets:

```shell
wrangler secret put PRIVATE_KEY 
wrangler secret put VEN_API_KEY 
```


## How Data is Extracted

- All source URLs for a feed are loaded.
- A numerical value is extracted from the field at the specified path.
- Any errors are ignored.
- Values that deviate more than 10% from the average of all sources are disregarded as outliers.
- The average value of all remaining source values is the calculated value.


## How Data is Updated

For each data update, the blockchain is checked for the latest stored information. The `contract.nodeUrl` and `contract.address` are used to fetch this information.

* `heartbeat` sets the maximum age for the chain-information. If the data is older, it will be updated.
* `deviationPoints` sets the change to the chain-information that triggers an immediate update. (100 points = 1%)

The contract interface is configured in `constants/Contract.ts`.

Updates are published using [vechain.energy Relayer](https://docs.vechain.energy/vechain.energy/API-Keys/).

## Confidential Information

* `PRIVATE_KEY` refers to the wallet that has `REPORTER_ROLE` access on the oracle contract.
* `VEN_API_KEY` is the key for the vechain.energy API used by the relayer.

You can set these as secret variables using wrangler:

```shell
$ wrangler secret put PRIVATE_KEY 
✔ Enter a secret value: … ******************************************************************
🌀 Creating the secret for the Worker "reporter" 
✨ Success! Uploaded secret PRIVATE_KEY

$ wrangler secret put VEN_API_KEY 
✔ Enter a secret value: … ******************************************************************************************
🌀 Creating the secret for the Worker "reporter" 
✨ Success! Uploaded secret VEN_API_KEY
```

For local development, define them in `.dev.vars` before running `wrangler dev`

## Example Source: VET-USD

```json
[
        {
            "url": "https://api.coinbase.com/v2/exchange-rates?currency=VET",
            "path": ".data.rates.USD"
        },
        {
            "url": "https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=VET-USDT",
            "path": ".data.price"
        },
        {
            "url": "https://api.coincap.io/v2/assets/vechain",
            "path": ".data.priceUsd"
        },
        {
            "url": "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?CMC_PRO_API_KEY=<CMC_API_KEY>&symbol=VET",
            "path": ".data.VET.0.quote.USD.price"
        },
        {
            "url": "https://api.coinbase.com/v2/exchange-rates?currency=VET",
            "path": ".data.rates.USD"
        },
        {
            "url": "https://api.binance.com/api/v3/avgPrice?symbol=VETUSDT",
            "path": ".price"
        },
        {
            "url": "https://api.coingecko.com/api/v3/simple/price?ids=vechain&vs_currencies=usd",
            "path": ".vechain.usd"
        }
]
```
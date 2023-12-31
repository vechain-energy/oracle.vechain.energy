# Oracle / Data Feed for Vechain

## Reporter Details

The reporter is a [serverless worker hosted on Cloudflare](https://developers.cloudflare.com/workers/). It fetches data from a pre-configured list of URLs and then publishes the extracted information to a Smart Contract. This makes the data available on-chain.

Each data feed has a corresponding [Cloudflare Durable Object](https://developers.cloudflare.com/durable-objects/). The `interval` setting determines how often (in seconds) the data from the `sources` is refreshed.

Configuration access is protected with an API-Key.

Each source is required to provide a JSON output. The numerical value is retrieved from a specified `path` in the source's output.

The data is sent to the contracts located at the `address` on `nodeUrl`, using the `PRIVATE_KEY` that has been set up. If a `delegationUrl` is provided, the system will ask for fee delegation before it submits the transaction.

The API is documented in [`public/swagger.yml`](./public/swagger.yml).

## Local Development

Configure `.dev.vars` with:

```yml
PRIVATE_KEY = ""
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
    "contracts": [
        {
            "nodeUrl": "https://node-testnet.vechain.energy",
            "address": "<CONTRACT_ADDRESS>"
        }
    ]
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
```

## How Data is Extracted

- All source URLs for a feed are loaded.
- A numerical value is extracted from the field at the specified path.
- Any errors are ignored.
- The [median value](https://en.wikipedia.org/wiki/Median#:~:text=The%20median%20of%20a%20finite,the%20middle%20one%20is%20selected.) is extracted

## How Data is Updated

For each data update, the blockchain is checked for the latest stored information. The `contract.nodeUrl` and `contract.address` are used to fetch this information.

- `heartbeat` sets the maximum age for the chain-information. If the data is older, it will be updated.
- `deviationPoints` sets the change to the chain-information that triggers an immediate update. (100 points = 1%)

The contract interface is configured in `constants/Contract.ts`.

If there are multiple reporters, the Oracle's contract will choose the next one to publish data.
Only the chosen reporter will submit data, or when an optional timeout is reached.
The timeout is the maximum number of seconds that can pass after an update is needed. If the preferred reporter doesn't publish data during this time, other reporters will step in.

## Confidential Information

- `PRIVATE_KEY` refers to the wallet that has `REPORTER_ROLE` access on the oracle contract.

You can set these as secret variables using wrangler:

```shell
$ wrangler secret put PRIVATE_KEY
✔ Enter a secret value: … ******************************************************************
🌀 Creating the secret for the Worker "reporter"
✨ Success! Uploaded secret PRIVATE_KEY
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

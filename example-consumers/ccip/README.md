# ccip

## Setup

```shell
yarn init -y
touch yarn.lock
yarn config set nodeLinker node-modules
yarn add ethers @chainlink/ethers-ccip-read-provider @vechain/web3-providers-connex @vechain/connex-framework @vechain/connex-driver
```

## Run

```shell
node test.js
```

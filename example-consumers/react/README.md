# react

## Setup

```shell
yarn init -y
touch yarn.lock
yarn config set nodeLinker node-modules
yarn add react react-dom ethers
yarn add @types/react @types/react-dom --dev
yarn add tailwindcss postcss autoprefixer --dev
yarn add parcel --dev
```

## Run

```shell
yarn parcel src/index.html
```

## Config

```env
ORACLE_ADDRESS="0x2d2BAF7d2a1e637C426d86e513d16BE717084985"
NODE_URL="https://node-testnet.vechain.energy"
```
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
ORACLE_API_URL="https://oracle.vechain.energy"
```
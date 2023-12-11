require("@nomiclabs/hardhat-waffle");
require('@vechain.energy/hardhat-thor')
require("hardhat-jest-plugin")
const ethers = require('ethers')

const privateKey = process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey

module.exports = {
    solidity: "0.8.19",
    settings: {
        optimizer: {
            enabled: true,
            runs: 2 ** 64,
        },
    },
    networks: {
        vechain: {
            url: 'https://node-testnet.vechain.energy',
            delegateUrl: process.env.DELEGATE_URL || 'https://sponsor-testnet.vechain.energy/by/90',
            privateKey,
            gas: 6000000
        },
        main: {
            url: 'https://node-mainnet.vechain.energy',
            delegateUrl: process.env.DELEGATE_URL,
            privateKey,
            gas: 6000000
        }
    }
};
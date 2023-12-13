const { Framework } = require('@vechain/connex-framework')
const { Driver, SimpleNet } = require('@vechain/connex-driver')
const { ethers, Interface } = require('ethers')

const contractAddress = process.argv[2]
if (!contractAddress) {
    console.error('missing contract address, use node test.js <address>')
    process.exit(1)
}

const ccipContract = new Interface([
    'function usdPriceVet() external view',
    'error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData)',
    'function usdPriceVetWithProof(bytes calldata response, bytes calldata extraData) public view returns (uint128 value, uint128 updatedAt, bytes feedId)'
])

async function main() {
    const driver = await Driver.connect(new SimpleNet('https://node-testnet.vechain.energy'))
    const connex = new Framework(driver)

    const result = await connex.thor
        .account(contractAddress)
        .method({
            "inputs": [],
            "name": "usdPriceVet",
            "outputs": [],
            "stateMutability": "view",
            "type": "function"
        })
        .call()

    if (result.reverted) {
        const error = ccipContract.parseError(result.data)

        if (error.name === 'OffchainLookup') {

            console.log('OffchainLookup detected')
            const backendArgs = {
                sender: ethers.hexlify(error.args[0]),
                urls: error.args.urls,
                callData: ethers.hexlify(error.args.callData),
                callbackFunction: ethers.hexlify(error.args.callbackFunction),
                extraData: ethers.hexlify(error.args.extraData)
            };

            for (const url of error.args.urls) {
                const response = await (async() => {
                    console.log('fetching response from', url)
                    const queryUrl = url.replace(/\{([^}]*)\}/g, (match, p1) => backendArgs[p1]);
                    if (url.includes('{data}')) {
                        console.log(`${url}`.replace('{sender}', backendArgs.sender).replace('{data}', backendArgs.data))
                        return await fetch(queryUrl)
                    } else {
                        console.log(backendArgs)
                        return await fetch(`${queryUrl}`, {
                            method: 'POST',
                            headers: {
                                'content-type': 'application/json'
                            },
                            body: JSON.stringify(backendArgs)
                        })
                    }

                })()

                const { data } = await response.json()
                const result = await connex.thor
                    .account(contractAddress)
                    .method({
                        "inputs": [{
                                "internalType": "bytes",
                                "name": "response",
                                "type": "bytes"
                            },
                            {
                                "internalType": "bytes",
                                "name": "extraData",
                                "type": "bytes"
                            }
                        ],
                        "name": "usdPriceVetWithProof",
                        "outputs": [{
                                "internalType": "uint128",
                                "name": "value",
                                "type": "uint128"
                            },
                            {
                                "internalType": "uint128",
                                "name": "updatedAt",
                                "type": "uint128"
                            },
                            {
                                "internalType": "bytes32",
                                "name": "feedId",
                                "type": "bytes32"
                            }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                    })
                    .call(data, error.args.extraData)

                if (result.reverted) {
                    console.error(result)
                    throw new Error(result.revertReason)
                }

                console.log('Current data is', ethers.formatUnits(result.decoded.value, 12), 'updated at', (new Date(Number(result.decoded.updatedAt) * 1000).toISOString()), result.decoded.feedId)
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
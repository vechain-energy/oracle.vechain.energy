const { Framework } = require('@vechain/connex-framework')
const { Driver, SimpleNet } = require('@vechain/connex-driver')
const { ethers, Interface } = require('ethers')

const contractAddress = process.argv[2]
if (!contractAddress) {
    console.error('missing contract address, use node test.js <address>')
    process.exit(1)
}

const ccipContractInterface = new Interface([
    'function usdPriceVet()',
    'error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData)',
    'function usdPriceVetWithProof(bytes calldata response, bytes calldata extraData) returns (uint128 value, uint128 updatedAt, bytes32 feedId)'
])

const oracleAddress = '0x12E3582D7ca22234f39D2A7BE12C98ea9c077E25'

async function main() {

    console.log('Asking Oracle Contract\n')
    const resultOracle = await connexCall({
        address: oracleAddress,
        abi: { "inputs": [{ "internalType": "bytes32", "name": "id", "type": "bytes32" }], "name": "getLatestValue", "outputs": [{ "internalType": "uint128", "name": "value", "type": "uint128" }, { "internalType": "uint128", "name": "updatedAt", "type": "uint128" }], "stateMutability": "view", "type": "function" },
        args: [ethers.encodeBytes32String('vet-usd')]
    })
    console.log('Value', ethers.formatUnits(resultOracle.decoded.value, 12))
    console.log('Updated At', (new Date(Number(resultOracle.decoded.updatedAt) * 1000).toISOString()))

    console.log('\n\n')

    console.log('Asking CCIP Contract\n')
    const resultOffChain = await connexCall({
        address: contractAddress,
        abi: { "inputs": [], "name": "usdPriceVet", "outputs": [], "stateMutability": "view", "type": "function" },
        args: []
    })
    console.log('Value', ethers.formatUnits(resultOffChain.decoded.value, 12))
    console.log('Updated At', (new Date(Number(resultOffChain.decoded.updatedAt) * 1000).toISOString()))
    console.log('Feed Id', ethers.decodeBytes32String(resultOffChain.decoded.feedId))

}

async function connexCall({ address, abi, args }) {
    const driver = await Driver.connect(new SimpleNet('https://node-testnet.vechain.energy'))
    const connex = new Framework(driver)

    const result = await connex.thor
        .account(address)
        .method(abi)
        .call(...args)

    if (!result.reverted) {
        return result
    }
    if (result.reverted) {
        const error = ccipContractInterface.parseError(result.data)

        if (error.name === 'OffchainLookup') {
            // console.log('OffchainLookup detected')
            const backendArgs = {
                sender: ethers.hexlify(error.args[0]),
                urls: error.args.urls,
                callData: ethers.hexlify(error.args.callData),
                callbackFunction: ethers.hexlify(error.args.callbackFunction),
                extraData: ethers.hexlify(error.args.extraData)
            };

            for (const url of error.args.urls) {
                const response = await (async() => {
                    // console.log('fetching response from', url)
                    const queryUrl = url.replace(/\{([^}]*)\}/g, (match, p1) => backendArgs[p1]);
                    if (url.includes('{data}')) {
                        // console.log('GET', `${url}`.replace('{sender}', backendArgs.sender).replace('{data}', backendArgs.data))
                        return await fetch(queryUrl)
                    } else {
                        // console.log('POST', queryUrl, backendArgs)
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

                // callbackFunction + args()
                const contractCall = ethers.solidityPacked(
                    ['bytes4', 'bytes'], [
                        // callbackFunction(bytes, bytes)
                        backendArgs.callbackFunction, ethers.AbiCoder.defaultAbiCoder().encode(
                            ['bytes', 'bytes'], [data, backendArgs.extraData]
                        )
                    ]
                );

                const [result] = await (await fetch('https://node-testnet.vechain.energy/accounts/*', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        clauses: [{
                            to: backendArgs.sender,
                            data: contractCall
                        }]
                    })
                })).json()

                if (result.reverted) {
                    console.error(result)
                    throw new Error(result.revertReason)
                }

                const decoded = ccipContractInterface.decodeFunctionResult(backendArgs.callbackFunction, result.data)
                return {
                    ...result,
                    decoded
                }
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
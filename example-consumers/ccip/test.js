const { Framework } = require('@vechain/connex-framework')
const { Driver, SimpleNet } = require('@vechain/connex-driver')
const thor = require('@vechain/web3-providers-connex')
const { ethers, Contract, Interface } = require('ethers')
const { CCIPReadProvider } = require('@chainlink/ethers-ccip-read-provider')

const contractAddress = '0x301aee1259F182636FadAe08871269aBE55f482c'


const ccipContract = new Interface([
    'function usdPriceVet() external view',
    'error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData)',
    'function usdPriceVetWithProof(bytes calldata response, bytes calldata extraData) public view returns (uint128 value, uint128 updatedAt)'
])

async function main() {
    const driver = await Driver.connect(new SimpleNet('https://node-testnet.vechain.energy'))
    const connex = new Framework(driver)

    // const outerProvider = thor.ethers.modifyProvider(
    //     new ethers.BrowserProvider(
    //         new thor.Provider({ connex })
    //     )
    // )

    // const provider = new CCIPReadProvider(outerProvider);

    // const contract = new Contract(contractAddress, [
    //     'function usdPriceVet() external view'
    // ], provider);



    // const result = await contract.usdPriceVet()
    // console.log(result)


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
            const backendArgs = { sender: ethers.hexlify(error.args[0]), data: ethers.hexlify(error.args.callData) };

            for (const url of error.args.urls) {
                const response = await (async() => {
                    console.log('fetching response from', url)

                    if (url.includes('{data}')) {
                        return await fetch(`${url}`.replace('{sender}', backendArgs.sender).replace('{data}', backendArgs.data))
                    } else {
                        return await fetch(`${url}`, {
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
                            }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                    })
                    .call(data, error.args.extraData)

                if (result.reverted) {
                    throw new Error(result.revertReason)
                }

                console.log('Current data is', ethers.formatUnits(result.decoded.value, 12), 'updated at', (new Date(Number(result.decoded.updatedAt) * 1000).toISOString()))

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
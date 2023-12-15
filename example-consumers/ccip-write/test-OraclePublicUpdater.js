const { Framework } = require('@vechain/connex-framework')
const { Driver, SimpleNet } = require('@vechain/connex-driver')
const { Transaction, secp256k1 } = require('thor-devkit')
const { ethers, Interface } = require('ethers')

const contractAddress = process.argv[2]
if (!contractAddress) {
    console.error('missing contract address, use node test.js <address>')
    process.exit(1)
}

const updaterContract = new Interface([
    'function updateFeedWithProof(bytes calldata response, bytes calldata extraData)'
])

async function main() {
    const driver = await Driver.connect(new SimpleNet('https://node-testnet.vechain.energy'))
    const connex = new Framework(driver)

    // fetch signed data, signed for the contracts address
    const url = `http://localhost:8787/vet-usd/resolver?sender=${contractAddress}&data=${ethers.encodeBytes32String('vet-usd')}`
    console.log('fetching signed response from', url)
    const { data } = await (await fetch(url)).json()
    const clauses = [{
        to: contractAddress,
        value: 0,
        data: updaterContract.encodeFunctionData('updateFeedWithProof', [data, '0x'])
    }]
    console.log('received response', data)

    const wallet = ethers.Wallet.createRandom()

    const transaction = new Transaction({
        chainTag: Number.parseInt(connex.thor.genesis.id.slice(-2), 16),
        blockRef: connex.thor.status.head.id.slice(0, 18),
        expiration: 32,
        clauses,
        gas: connex.thor.genesis.gasLimit,
        gasPriceCoef: 0,
        dependsOn: null,
        nonce: +new Date(),
        reserved: {
            features: 1 // this enables the fee delegation feature
        }
    })

    console.log('requesting fee delegation')
    const { signature, error } = await (await fetch('https://sponsor-testnet.vechain.energy/by/90', {
        method: 'POST',
        headers: {
            'contente-type': 'application/json'
        },
        body: JSON.stringify({
            origin: wallet.address,
            raw: `0x${transaction.encode().toString('hex')}`
        })
    })).json()

    if (!signature) {
        throw new Error(`could not get a fee sponsorship: ${error}`)
    }

    const signingHash = transaction.signingHash()
    const originSignature = secp256k1.sign(signingHash, Buffer.from(wallet.privateKey.slice(2), 'hex'))
    const sponsorSignature = Buffer.from(signature.substr(2), 'hex')
    transaction.signature = Buffer.concat([originSignature, sponsorSignature])

    console.log('sending transaction')
    const tx = await (await fetch('https://node-testnet.vechain.energy/transactions', {
        method: 'POST',
        headers: {
            'contente-type': 'application/json'
        },
        body: JSON.stringify({
            raw: `0x${transaction.encode().toString('hex')}`
        })
    })).json()
    console.log('transaction sent', `https://explore-testnet.vechain.org/transactions/${tx.id}`)

}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
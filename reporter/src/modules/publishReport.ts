import type { FeedContract, Report, Env } from '../types'
import { ethers } from 'ethers'
import { OracleV1 } from '../constants/Contract'
import { Transaction } from './thor-devkit/transaction'
import signTransaction from './signTransaction'
import estimateGas from '@vechain.energy/gas'

const gasPriceCoef = 128

export default async function publishReport({ contract, report, env }: { contract: FeedContract, report: Report, env?: { PRIVATE_KEY: string } }): Promise<string> {
    const identity = env?.PRIVATE_KEY ? new ethers.Wallet(env?.PRIVATE_KEY) : ethers.Wallet.createRandom()
    const clauses = [
        {
            to: contract.address,
            value: "0x0",
            data: OracleV1.encodeFunctionData('updateValue', [ethers.encodeBytes32String(report.id), report.value, report.updatedAt])
        }
    ]

    const genesisBlock = await (await fetch(`${contract.nodeUrl}/blocks/0`)).json() as Connex.Thor.Block
    const bestBlock = await (await fetch(`${contract.nodeUrl}/blocks/best`)).json() as Connex.Thor.Block

    const gas = await estimateGas(clauses, {
        nodeOrConnex: contract.nodeUrl,
        gasPriceCoef,
        caller: identity.address
    })
    const transaction = new Transaction({
        chainTag: Number.parseInt(genesisBlock.id.slice(-2), 16),
        blockRef: bestBlock.id.slice(0, 18),
        expiration: 32,
        clauses,
        gas,
        gasPriceCoef,
        dependsOn: null,
        nonce: Date.now(),
        reserved: { features: contract.delegationUrl ? 1 : 0 }
    })

    const sponsorSignature = await (async (): Promise<string | undefined> => {
        if (!contract.delegationUrl) { return }
        const sponsorshipRes = await fetch(contract.delegationUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ origin: identity.address, raw: `0x${transaction.encode().toString('hex')}` })
        })

        const sponsorship = await sponsorshipRes.json() as { signature?: string, code?: string, message?: string }
        if (!sponsorship.signature) {
            throw new Error(sponsorship.message || sponsorship.code || 'Sponsorship failed')
        }

        return sponsorship.signature
    })()

    const originSignature = await signTransaction(transaction, identity.privateKey)
    transaction.signature = Buffer.concat([
        Buffer.from(originSignature.signature.slice(2), 'hex'),
        Buffer.from((sponsorSignature ?? '0x').slice(2), 'hex')
    ])

    const rawTransaction = `0x${transaction.encode().toString('hex')}`
    const txResult = await (await fetch(`${contract.nodeUrl}/transactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw: rawTransaction })
    })).text()

    return txResult
}

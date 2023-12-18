import type { FeedContract, Report, Env } from '../types'
import { ethers } from 'ethers'
import { OracleV1 } from '../constants/Contract'

export default async function publishReport({ contract, report, env }: { contract: FeedContract, report: Report, env?: Env }): Promise<string> {
    const clauses = [
        {
            to: contract.address,
            data: OracleV1.encodeFunctionData('updateValue', [ethers.encodeBytes32String(report.id), report.value, report.updatedAt])
        }
    ]

    // @TODO: sign & submit transaction (optionally with fee delegation)
    const txResult = await (await fetch('https://api.vechain.energy/v1/transaction', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-private-key': env?.PRIVATE_KEY ?? ''
        },
        body: JSON.stringify({ clauses })
    })).text()

    return txResult
}

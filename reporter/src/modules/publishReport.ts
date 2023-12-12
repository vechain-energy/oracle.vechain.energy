import type { FeedConfig, Report, Env } from '../types'
import { ethers } from 'ethers'
import { Oracle } from '../constants/Contract'

export default async function publishReport({ config, report, env }: { config: FeedConfig, report: Report, env?: Env }): Promise<string> {
    const clauses = [
        {
            to: config.contract.address,
            data: Oracle.encodeFunctionData('updateValue', [ethers.encodeBytes32String(report.id), report.value, report.updatedAt])
        }
    ]

    const txResult = await (await fetch('https://api.vechain.energy/v1/transaction', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': env?.VEN_API_KEY ?? '',
            'x-private-key': env?.PRIVATE_KEY ?? ''
        },
        body: JSON.stringify({ clauses })
    })).text()

    return txResult
}

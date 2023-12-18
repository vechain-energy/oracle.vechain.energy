import { OracleV1 } from "../constants/Contract";
import type { FeedConfig, FeedContract } from "../types";
import { ethers } from 'ethers'

export default async function requiredUpdates(config: FeedConfig, newValue: bigint): Promise<FeedContract[]> {
    const requiredUpdates = []
    for (const contract of config.contracts) {
        const shouldUpdate = await isUpdateRequired(config, contract, newValue)
        if (shouldUpdate) {
            requiredUpdates.push(contract)
        }
    }

    return requiredUpdates
}

export async function isUpdateRequired(config: FeedConfig, feedContract: FeedContract, newValue: bigint): Promise<boolean> {
    const response = (await (
        await fetch(`${feedContract.nodeUrl}/accounts/*`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                clauses: [
                    {
                        to: feedContract.address,
                        data: OracleV1.encodeFunctionData(
                            "getLatestValue",
                            [ethers.encodeBytes32String(config.id)]
                        ),
                    },
                ],
            }),
        })
    ).json()) as { data: string; reverted: boolean }[];

    // node errors
    if (!Array.isArray(response) || response.length < 1) { return false }

    // feed is not known
    if (response[0].reverted) { return true }


    const { value, updatedAt } = OracleV1.decodeFunctionResult(
        "getLatestValue",
        response[0].data
    ) as unknown as { value: bigint, updatedAt: bigint };

    // verify age
    const now = Math.floor(Date.now() / 1000)
    const age = now - Number(updatedAt)
    process.env.NODE_ENV !== 'test' && console.log('age', age, 'heartbeat', config.heartbeat)
    if (age >= config.heartbeat) { return true }


    // verify deviation in points
    const diff = newValue - value
    const onePoint = value / 10000n
    const deviationPoints = onePoint > 0 ? Math.abs(Number(diff / onePoint)) : 0
    process.env.NODE_ENV !== 'test' && console.log('deviation', deviationPoints, '/', config.deviationPoints)
    if (deviationPoints >= config.deviationPoints) { return true }


    return false

}
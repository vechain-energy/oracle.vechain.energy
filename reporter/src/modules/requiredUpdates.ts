import { OracleV1 } from "../constants/Contract";
import type { Env, FeedConfig, FeedContract } from "../types";
import { ethers } from 'ethers'

export default async function requiredUpdates(config: FeedConfig, newValue: bigint, env?: { PRIVATE_KEY: string }): Promise<FeedContract[]> {
    const requiredUpdates = []
    for (const contract of config.contracts) {
        const { update, preferedReporter } = await isUpdateRequired(config, contract, newValue)
        if (update) {
            requiredUpdates.push({ ...contract, preferedReporter })
        }
    }

    return requiredUpdates
}

export async function isUpdateRequired(config: FeedConfig, feedContract: FeedContract, newValue: bigint): Promise<{ update: boolean, preferredReporter?: string|undefined }> {
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
                    {
                        to: feedContract.address,
                        data: OracleV1.encodeFunctionData(
                            "getPreferredReporter",
                            []
                        ),
                    }
                ],
            }),
        })
    ).json()) as { data: string; reverted: boolean }[];

    // node errors
    if (!Array.isArray(response) || response.length < 1) { return { update: false } }

    // feed is not known
    if (response[0].reverted) { return { update: true } }

    // get current feed data
    const { value, updatedAt } = OracleV1.decodeFunctionResult(
        "getLatestValue",
        response[0].data
    ) as unknown as { value: bigint, updatedAt: bigint };

    // calculate age
    const now = Math.floor(Date.now() / 1000)
    const age = now - Number(updatedAt)
    process.env.NODE_ENV !== 'test' && console.log(feedContract.address, 'age', age, 'heartbeat', config.heartbeat)

    // calculate deviation
    const diff = newValue - value
    const onePoint = value / 10000n
    const deviationPoints = onePoint > 0 ? Math.abs(Number(diff / onePoint)) : 0
    process.env.NODE_ENV !== 'test' && console.log(feedContract.address, 'deviation', deviationPoints, '/', config.deviationPoints)

    // has a preferredReporter
    let preferredReporter: string | undefined
    if (response[1] && !response[1].reverted) {
        const { reporter } = OracleV1.decodeFunctionResult(
            "getPreferredReporter",
            response[1].data
        ) as unknown as { reporter: string };

        preferredReporter = reporter
    }

    // verify age
    if (age >= config.heartbeat) { return { update: true, preferredReporter } }

    // verify deviation in points
    if (deviationPoints >= config.deviationPoints) { return { update: true, preferredReporter } }


    return { update: false, preferredReporter }

}
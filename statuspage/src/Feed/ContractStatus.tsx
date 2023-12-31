import React from 'react'
import { useQuery } from 'react-query'
import HealthyBadge from './HealthBadge';
import LoadingIndicator from './LoadingIndicator';
import { OracleInterface } from '../constants';
import { encodeBytes32String, formatUnits } from 'ethers'
import { formatDistanceToNowStrict } from 'date-fns'
import type { Status, FeedContract } from "../types"


type OracleValue = {
    value: bigint;
    updatedAt: bigint;
};


export default function ContractStatus({ status, contract }: { status: Status, contract: FeedContract }) {
    const isHealthy = !status.unhealthyContracts.some(({ address }) => address === contract.address)
    const { data, isLoading } = useQuery<OracleValue | undefined>({
        queryKey: [contract.address, status.id, contract.nodeUrl],
        queryFn: () => getLatestValue(status.id, contract),
        enabled: true,
        keepPreviousData: true,
        refetchOnMount: true
    })

    if (isLoading) {
        return <LoadingIndicator />
    }

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start space-y-4 sm:space-y-0">
            <span className="font-mono text-sm">
                <div>{contract.address}</div>
                <div className="font-mono text-xs text-stone-400 dark:text-white-800">{contract.nodeUrl}</div>
            </span>

            <div className="sm:text-right text-xs w-full sm:w-auto">
                <div className="font-mono">
                    {formatUnits(data?.value ?? '0', 12)}
                </div>
                <div className="font-mono text-xs text-stone-400 dark:text-white-800">
                    <div>
                        {Boolean(data?.updatedAt)
                            ? formatDistanceToNowStrict(new Date(Number(data!.updatedAt) * 1000), { addSuffix: true })
                            : ''
                        }
                    </div>
                    {
                        (Boolean(status.latestValue?.value) && Boolean(data?.value))
                        && <div className="text-stone-400 dark:text-white-800" title='Deviation'>
                            (deviated by {calculateDeviation(
                                Number(formatUnits(status.latestValue!.value ?? '0', 12)),
                                Number(formatUnits(data?.value ?? '0', 12))
                            )} points)
                        </div>
                    }

                </div>
            </div>

            <div className="w-full sm:w-auto">
                <HealthyBadge healthy={isHealthy} />
            </div>
        </div>
    )
}



async function getLatestValue(feedId: string, contract: FeedContract): Promise<OracleValue | undefined> {
    const response = (await (
        await fetch(`${contract.nodeUrl}/accounts/*`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                clauses: [
                    {
                        to: contract.address,
                        data: OracleInterface.encodeFunctionData("getLatestValue", [
                            encodeBytes32String(feedId),
                        ]),
                    },
                ],
            }),
        })
    ).json()) as { data: string; reverted: boolean }[];

    if (!Array.isArray(response) || !response.length || response[0].reverted) {
        return;
    }

    const { value, updatedAt } = OracleInterface.decodeFunctionResult(
        "getLatestValue",
        response[0].data
    ) as unknown as OracleValue;

    return { value, updatedAt };
}

function calculateDeviation(val1: number, val2: number): number {
    const percentage = 1 - (val1 / val2)
    const points = Math.abs(Math.floor(percentage * 10000))

    return points
}
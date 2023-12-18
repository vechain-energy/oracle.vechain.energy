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
        queryKey: [contract.address],
        queryFn: () => getLatestValue(contract),
        enabled: true,
        keepPreviousData: true
    })

    if (isLoading) {
        return <LoadingIndicator />
    }

    return (
        <div className="flex justify-between items-center">
            <span className="font-mono text-sm">
                <div>{contract.address}</div>
                <div className="font-mono text-xs text-stone-400 dark:text-stone-800">{contract.nodeUrl}</div>
            </span>

            <div className="text-right text-xs">
                <div className="font-mono">{formatUnits(data?.value ?? '0', 12)}</div>
                <div className="font-mono text-xs text-stone-400 dark:text-stone-800">
                    {Boolean(data?.updatedAt)
                        ? formatDistanceToNowStrict(new Date(Number(data!.updatedAt) * 1000), { addSuffix: true })
                        : ''
                    }
                </div>
            </div>

            <div className="self-start">
                <HealthyBadge healthy={isHealthy} />
            </div>
        </div>
    )
}



async function getLatestValue(contract: FeedContract): Promise<OracleValue | undefined> {
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
                            encodeBytes32String("vet-usd"),
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
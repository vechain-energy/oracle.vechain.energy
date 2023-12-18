import React from 'react'
import { useQuery } from 'react-query'
import { ORACLE_API_URL } from "../constants";
import type { Status } from '../types'
import { formatDuration, formatDistanceToNowStrict } from 'date-fns'


const UPDATE_INTERVAL_SECONDS = 30
export default function FeedStatus({ feedId }: { feedId: string }): React.ReactElement {
    const { data, isLoading } = useQuery<Status>({
        queryKey: [feedId],
        queryFn: ({ queryKey }) => fetch(`${ORACLE_API_URL}/${queryKey[0]}`).then((res) => res.json()),
        enabled: true,
        keepPreviousData: true,
        refetchInterval: UPDATE_INTERVAL_SECONDS * 1000
    })

    return (
        <div className="rounded overflow-hidden shadow-lg p-4">
            {(isLoading || !data)
                ? <LoadingIndicator />
                : <StatusSheet status={data} />
            }
        </div>
    )
}

function LoadingIndicator() {
    return (
        <div className="flex items-center justify-center w-56 h-56 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <div role="status">
                <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" /><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" /></svg>
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    )
}

function StatusSheet({ status }: { status: Status }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-bold text-xl uppercase">{status.id}</h1>
                {Boolean(status.latestValue) && <h2 className="font-bold text-xl">{status.latestValue!.formattedValue}</h2>}
            </div>

            <dl className="divide-y divide-gray-100">
                <div className="px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">

                    <dt className="text-sm font-thin leading-6">Updated</dt>
                    <dd className="mt-1 font-mono text-sm leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {Boolean(status.latestValue)
                            ? formatDistanceToNowStrict(new Date(status.latestValue!.updatedAt! * 1000), { addSuffix: true })
                            : 'not yet'
                        }
                    </dd>

                    <dt className="text-sm font-thin leading-6">Scheduled Update</dt>
                    <dd className="mt-1 font-mono text-sm leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {Boolean(status.nextUpdate)
                            ? formatDistanceToNowStrict(new Date(status.nextUpdate!), { addSuffix: true })
                            : 'not planned'
                        }
                    </dd>
                </div>
            </dl>


            <div className="inline-flex items-center justify-center w-full">
                <hr className="w-full h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
                <span className="absolute px-3 font-thin text-xs text-gray-900 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-gray-900 uppercase">Config</span>
            </div>


            <dl className="divide-y divide-gray-100">
                <div className="px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">

                    <dt className="text-sm font-thin leading-6 capitalize">Updating every</dt>
                    <dd className="mt-1 font-mono text-sm leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {formatDuration({ seconds: status.config.interval })}
                    </dd>

                    <dt className="text-sm font-thin leading-6">Heartbeat</dt>
                    <dd className="mt-1 font-mono text-sm leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {formatDuration({ seconds: status.config.heartbeat })}
                    </dd>

                    <dt className="text-sm font-thin leading-6">Deviation Threshold</dt>
                    <dd className="mt-1 font-mono text-sm leading-6  sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {status.config.deviationPoints / 100}%
                    </dd>

                </div>
            </dl>


            <div className="inline-flex items-center justify-center w-full">
                <hr className="w-full h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
                <span className="absolute px-3 font-thin text-xs text-gray-900 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-gray-900 uppercase">Contracts</span>
            </div>


            <ul>
                {status.config.contracts.map(contract => {
                    const isHealthy = !status.unhealthyContracts.some(({ address }) => address === contract.address)
                    return (
                        <li key={contract.address} className="flex justify-between items-center">
                            <span className="font-mono text-sm">
                                <div>{contract.address}</div>
                                <div className="font-mono text-xs text-stone-400 dark:text-stone-800">{contract.nodeUrl}</div>
                            </span>
                            <HealthyBadge healthy={isHealthy} />
                        </li>
                    )
                })}
            </ul>

        </div>
    )
}

function HealthyBadge({ healthy = false }: { healthy: boolean }) {
    if (healthy) {
        return <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">healthy</span>
    }
    return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">unhealthy</span>
}
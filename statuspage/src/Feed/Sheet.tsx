import React from 'react'
import { formatDuration, formatDistanceToNowStrict } from 'date-fns'
import ContractStatus from './ContractStatus'
import type { Status } from '../types'

export default function FeedSheet({ status }: { status: Status }) {
    return (
        <div className="">
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-bold text-xl uppercase">{status.id}</h1>
                {Boolean(status.latestValue) && <h2 className="font-bold text-xl">{status.latestValue!.formattedValue}</h2>}
            </div>

            <dl className="divide-y divide-gray-100">
                <div className="px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">

                    <dt className="font-thin leading-6">Updated</dt>
                    <dd className="mt-1 font-mono leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {Boolean(status.latestValue)
                            ? formatDistanceToNowStrict(new Date(status.latestValue!.updatedAt! * 1000), { addSuffix: true })
                            : 'not yet'
                        }
                    </dd>

                    <dt className="font-thin leading-6">Scheduled Update</dt>
                    <dd className="mt-1 font-mono leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {Boolean(status.nextUpdate)
                            ? formatDistanceToNowStrict(new Date(status.nextUpdate!), { addSuffix: true })
                            : 'not planned'
                        }
                    </dd>
                </div>
            </dl>


            <div className="inline-flex items-center justify-center w-full relative">
                <hr className="w-full h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
                <span className="absolute px-3 font-thin text-xs text-gray-900 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-gray-900 uppercase">Config</span>
            </div>


            <dl className="divide-y divide-gray-100">
                <div className="px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">

                    <dt className="font-thin leading-6 capitalize">Updating every</dt>
                    <dd className="mt-1 font-mono leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {formatDuration({ seconds: status.config.interval })}
                    </dd>

                    <dt className="font-thin leading-6">Heartbeat</dt>
                    <dd className="mt-1 font-mono leading-6 sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {formatDuration({ seconds: status.config.heartbeat })}
                    </dd>

                    <dt className="font-thin leading-6">Deviation Threshold</dt>
                    <dd className="mt-1 font-mono leading-6  sm:col-span-2 sm:mt-0 flex space-x-2 items-baseline sm:justify-end pb-4 sm:pb-0">
                        {status.config.deviationPoints} points
                    </dd>

                </div>
            </dl>


            <div className="inline-flex items-center justify-center w-full relative">
                <hr className="w-full h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
                <span className="absolute px-3 font-thin text-xs text-gray-900 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-gray-900 uppercase">Contracts</span>
            </div>


            <ul className="p-4 sm:p-0">
                {status.config.contracts.map(contract =>
                    <li key={contract.address}>
                        <ContractStatus status={status} contract={contract} />
                    </li>
                )}
            </ul>

        </div>
    )
}

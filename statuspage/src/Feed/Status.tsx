import React from 'react'
import { useQuery } from 'react-query'
import { ORACLE_API_URL } from "../constants";
import type { Status } from '../types'
import LoadingIndicator from './LoadingIndicator';
import FeedSheet from './Sheet';

const UPDATE_INTERVAL_SECONDS = 30
export default function FeedStatus({ feedId }: { feedId: string }): React.ReactElement {
    const { data, isLoading } = useQuery<Status | { message: string }>({
        queryKey: [feedId],
        queryFn: () => fetch(`${ORACLE_API_URL}/${feedId}`).then((res) => res.json()),
        enabled: true,
        keepPreviousData: true,
        refetchInterval: UPDATE_INTERVAL_SECONDS * 1000
    })

    if (data && 'message' in data) {
        return <div className="text-red-600 font-bold">{feedId}: {data.message}</div>
    }

    return (
        <div className="rounded overflow-hidden shadow-lg dark:shadow-stone-700 p-4">
            {(isLoading || !data)
                ? <LoadingIndicator />
                : <FeedSheet status={data} />
            }
        </div>
    )
}


import React from 'react'
import { useQuery } from 'react-query'
import { ORACLE_API_URL } from "../constants";
import type { Status } from '../types'
import LoadingIndicator from './LoadingIndicator';
import FeedSheet from './Sheet';

const UPDATE_INTERVAL_SECONDS = 30
export default function FeedStatus({ feedId }: { feedId: string }): React.ReactElement {
    const { data, isLoading } = useQuery<Status>({
        queryKey: [feedId],
        queryFn: ({ queryKey }) => fetch(`${ORACLE_API_URL}/${feedId}`).then((res) => res.json()),
        enabled: true,
        keepPreviousData: true,
        refetchInterval: UPDATE_INTERVAL_SECONDS * 1000
    })

    return (
        <div className="rounded overflow-hidden shadow-lg p-4">
            {(isLoading || !data)
                ? <LoadingIndicator />
                : <FeedSheet status={data} />
            }
        </div>
    )
}


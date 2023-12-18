import React from "react";
import { FEED_IDS } from "./constants";
import FeedStatus from './Feed/Status'
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: false
      },
      
    }
  });

  export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <div className="w-full h-full flex justify-center">
                <div className="max-w-2xl w-full space-y-24 m-12">
                    {FEED_IDS.map(feedId =>
                        (<FeedStatus key={feedId} feedId={feedId} />)
                    )}
                </div>
            </div>
        </QueryClientProvider>
    );
}
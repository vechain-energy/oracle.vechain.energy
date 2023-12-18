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
      <div className="w-full h-full flex justify-center flex-wrap">
        {FEED_IDS.map(feedId =>
          <div key={feedId} className="lg:max-w-2xl w-full m-12">
            <FeedStatus feedId={feedId} />
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}
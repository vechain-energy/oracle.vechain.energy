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
      <div className="w-full h-full min-h-screen flex justify-center flex-wrap bg-white-100 dark:bg-gray-900 text-black dark:text-white">
        {FEED_IDS.map(feedId =>
          <div key={feedId} className="lg:max-w-2xl w-full m-12">
            <FeedStatus feedId={feedId} />
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}
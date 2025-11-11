import { SWRConfiguration } from 'swr';

export const swrConfig: SWRConfiguration = {
  // Cache data for 5 minutes
  dedupingInterval: 300000,
  // Revalidate on focus after 1 minute
  focusThrottleInterval: 60000,
  // Keep data in cache even when component unmounts
  keepPreviousData: true,
  // Don't revalidate on mount if data is fresh
  revalidateOnMount: true,
  // Revalidate when window gets focus
  revalidateOnFocus: false,
  // Revalidate on reconnect
  revalidateOnReconnect: true,
  // Error retry
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  // Fetcher function
  fetcher: async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const error = new Error('An error occurred while fetching the data.');
      throw error;
    }
    return res.json();
  },
};

// POST request fetcher
export const postFetcher = async ([url, body]: [string, any]) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }

  return res.json();
};

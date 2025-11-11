'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { useEffect, useState } from 'react';

// LocalStorage provider for SWR cache persistence
function localStorageProvider() {
  const map = new Map<string, any>(JSON.parse(localStorage.getItem('app-cache') || '[]'));

  // Save cache to localStorage periodically
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const appCache = JSON.stringify(Array.from(map.entries()));
      localStorage.setItem('app-cache', appCache);
    });

    // Also save every 30 seconds
    setInterval(() => {
      const appCache = JSON.stringify(Array.from(map.entries()));
      localStorage.setItem('app-cache', appCache);
    }, 30000);
  }

  return map;
}

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // On server, use default config without localStorage
  if (!isClient) {
    return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
  }

  // On client, use localStorage provider
  return (
    <SWRConfig
      value={{
        ...swrConfig,
        provider: localStorageProvider,
      }}
    >
      {children}
    </SWRConfig>
  );
}

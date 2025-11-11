import useSWR from 'swr';
import { postFetcher } from '../swr-config';

interface SearchParams {
  query: string;
  set?: string;
  rarity?: string;
  type?: string;
  language?: string;
  includePricing?: boolean;
}

export function useCardSearch(params: SearchParams, enabled: boolean = true) {
  const cacheKey = enabled ? ['/api/search-cards', params] : null;

  return useSWR(cacheKey, postFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes - prevent duplicate requests
    keepPreviousData: true,
  });
}

// Hook for fetching multiple pokemon at once
export function useBulkCardSearch(pokemonList: string[], includePricing: boolean = true) {
  // Create a stable cache key
  const cacheKey = pokemonList.length > 0 ? ['bulk-search', pokemonList.join(','), includePricing] : null;

  return useSWR(
    cacheKey,
    async () => {
      const allCards: any[] = [];

      // Fetch cards sequentially with delays to avoid rate limiting
      for (let i = 0; i < pokemonList.length; i++) {
        const pokemon = pokemonList[i];

        if (i > 0) {
          // Add delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        try {
          const response = await fetch('/api/search-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: pokemon, includePricing }),
          });

          if (response.ok) {
            const cards = await response.json();
            // Only include cards with valid images
            const cardsWithImages = cards.filter((card: any) => card.image);
            allCards.push(...cardsWithImages);
          }
        } catch (err) {
          console.error(`Error fetching ${pokemon}:`, err);
        }
      }

      return allCards;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 0, // Disable caching to prevent stale data
      keepPreviousData: true,
    }
  );
}

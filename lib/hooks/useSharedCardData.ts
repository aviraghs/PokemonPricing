import useSWR from 'swr';
import { useBulkCardSearch } from './useCardSearch';

// Shared hook for both PopularCards and MarketTrends with full pricing
// This ensures we only fetch once and both components use the same cached data
export function useSharedCardData() {
  const trendingPokemon = ['Charizard', 'Pikachu', 'Mewtwo', 'Umbreon', 'Rayquaza', 'Lugia'];

  return useBulkCardSearch(trendingPokemon, true);
}

// Optimized hook for main page - TCGdex data only (no pricing APIs)
export function useMainPageCardData() {
  const trendingPokemon = ['Charizard', 'Pikachu', 'Mewtwo', 'Umbreon', 'Rayquaza', 'Lugia'];
  const cacheKey = ['main-page-cards', trendingPokemon.join(',')];

  return useSWR(
    cacheKey,
    async () => {
      const allCards: any[] = [];

      // Fetch cards sequentially with delays to avoid rate limiting
      for (let i = 0; i < trendingPokemon.length; i++) {
        const pokemon = trendingPokemon[i];

        if (i > 0) {
          // Add delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        try {
          const response = await fetch('/api/search-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: pokemon,
              includePricing: false, // Only fetch TCGdex data, no pricing
              useJustTCGFallback: false,
            }),
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
      dedupingInterval: 60000, // 1 minute cache for PopularCards (fast enough for main page)
      keepPreviousData: true,
    }
  );
}

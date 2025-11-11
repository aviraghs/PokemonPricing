import { useBulkCardSearch } from './useCardSearch';

// Shared hook for both PopularCards and MarketTrends
// This ensures we only fetch once and both components use the same cached data
export function useSharedCardData() {
  const trendingPokemon = ['Charizard', 'Pikachu', 'Mewtwo', 'Umbreon', 'Rayquaza', 'Lugia'];

  return useBulkCardSearch(trendingPokemon, true);
}

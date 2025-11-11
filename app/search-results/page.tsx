'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import PokemonLoader from '@/components/PokemonLoader';
import { getFallbackImage } from '@/lib/image-fallback';
import styles from './page.module.css';

interface Card {
  id: string;
  name: string;
  image: string;
  set: { name: string; id: string };
  rarity: string;
  types?: string[];
  localId?: string;
  pricing?: {
    averagePrice: string | number;
    source: string;
    tcgPlayer?: {
      averagePrice?: string | number;
      marketPrice?: string | number;
      directLowPrice?: string | number;
    };
    pokemonPriceTracker?: {
      averagePrice?: string | number;
      marketPrice?: string | number;
      directLowPrice?: string | number;
    };
  };
}

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = searchParams.get('q') || '';
  const set = searchParams.get('set') || '';
  const rarity = searchParams.get('rarity') || '';
  const type = searchParams.get('type') || '';
  const lang = searchParams.get('lang') || 'en';

  useEffect(() => {
    searchCards();
  }, [query, set, rarity, type, lang]);

  const searchCards = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/search-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          set,
          rarity,
          type,
          language: lang,
          includePricing: true,
          useJustTCGFallback: true, // Enable JustTCG fallback for search results
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setCards(data);
    } catch (err) {
      setError('Failed to search cards. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (cardId: string) => {
    router.push(`/card-details?id=${cardId}&lang=${lang}`);
  };

  return (
    <>
      <StickyHeader />
      <div className={styles.page}>
        <div className={styles.container}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            ← Back
          </button>
          <div className={styles.header}>
            <h1 className={styles.title}>Search Results</h1>
            <p className={styles.subtitle}>
              {query && `Searching for "${query}"`}
              {set && ` in ${set}`}
            </p>
          </div>

          {loading && (
            <PokemonLoader message="Searching for cards..." size="large" />
          )}

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={searchCards} className={styles.retryBtn}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className={styles.resultsCount}>
                Found {cards.length} cards
              </div>

              {cards.length === 0 ? (
                <div className={styles.noResults}>
                  <div className={styles.noResultsIcon}>🔍</div>
                  <h2>No cards found</h2>
                  <p>Try adjusting your search criteria</p>
                  <button onClick={() => router.push('/')} className={styles.backBtn}>
                    Back to Home
                  </button>
                </div>
              ) : (
                <div className={styles.grid}>
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className={styles.card}
                      onClick={() => handleCardClick(card.id)}
                    >
                      <div className={styles.cardImage}>
                        {card.image ? (
                          <img
                            src={`${card.image}/high.webp`}
                            alt={card.name}
                            onError={(e) => {
                              // Fallback to low quality TCGdex image
                              if (e.currentTarget.src.includes('/high.webp')) {
                                e.currentTarget.src = `${card.image}/low.webp`;
                              } else {
                                // If low.webp also fails, try pokefetch.info
                                const pokefetchUrl = getFallbackImage(card.localId, card.set?.id);
                                if (pokefetchUrl && e.currentTarget.src !== pokefetchUrl) {
                                  e.currentTarget.src = pokefetchUrl;
                                } else {
                                  // If all fail, show placeholder
                                  e.currentTarget.style.display = 'none';
                                }
                              }
                            }}
                          />
                        ) : (
                          // If no TCGdex image, try pokefetch.info directly
                          <img
                            src={getFallbackImage(card.localId, card.set?.id) || ''}
                            alt={card.name}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className={styles.cardInfo}>
                        <h3 className={styles.cardName}>{card.name}</h3>
                        <p className={styles.cardSet}>{card.set?.name || 'Unknown Set'}</p>
                        <div className={styles.cardMeta}>
                          {card.localId && (
                            <span className={styles.cardNumber}>#{card.localId}</span>
                          )}
                          {card.rarity && (
                            <span className={styles.cardRarity}>{card.rarity}</span>
                          )}
                        </div>
                        {/* Pricing information */}
                        {card.pricing && (
                          <div className={styles.cardPricing}>
                            {card.pricing.tcgPlayer && card.pricing.tcgPlayer.averagePrice !== 'N/A' && (
                              <div className={styles.pricingItem}>
                                <span className={styles.pricingSource}>TCGPLR:</span>
                                <span className={styles.pricingValue}>
                                  {typeof card.pricing.tcgPlayer.averagePrice === 'number' 
                                    ? `$${card.pricing.tcgPlayer.averagePrice.toFixed(2)}` 
                                    : card.pricing.tcgPlayer.averagePrice}
                                </span>
                              </div>
                            )}
                            {card.pricing.pokemonPriceTracker && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A' && (
                              <div className={styles.pricingItem}>
                                <span className={styles.pricingSource}>PKMN:</span>
                                <span className={styles.pricingValue}>
                                  {typeof card.pricing.pokemonPriceTracker.averagePrice === 'number' 
                                    ? `$${card.pricing.pokemonPriceTracker.averagePrice.toFixed(2)}` 
                                    : card.pricing.pokemonPriceTracker.averagePrice}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={
      <>
        <StickyHeader />
        <div className={styles.page}>
          <PokemonLoader message="Loading search..." size="large" />
        </div>
      </>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}

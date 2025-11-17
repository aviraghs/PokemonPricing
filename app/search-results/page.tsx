'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import SkeletonLoader from '@/components/SkeletonLoader';
import AddToCollectionButton from '@/components/AddToCollectionButton';
import QuickAddButton from '@/components/QuickAddButton';
import CompareButton from '@/components/CompareButton';
import WishlistButton from '@/components/WishlistButton';
import { useToast } from '@/components/ToastProvider';
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
  hp?: string;
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
  const { showToast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [sortedCards, setSortedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cardSortPreference') || 'relevance';
    }
    return 'relevance';
  });

  const query = searchParams.get('q') || '';
  const set = searchParams.get('set') || '';
  const rarity = searchParams.get('rarity') || '';
  const type = searchParams.get('type') || '';
  const lang = searchParams.get('lang') || 'en';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minHP = searchParams.get('minHP') || '';
  const maxHP = searchParams.get('maxHP') || '';

  useEffect(() => {
    searchCards();
  }, [query, set, rarity, type, lang, minPrice, maxPrice, minHP, maxHP]);

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

      let data = await response.json();

      // Apply client-side advanced filters
      if (minPrice || maxPrice || minHP || maxHP) {
        data = data.filter((card: Card) => {
          // Price filtering
          if (minPrice || maxPrice) {
            const cardPrice = card.pricing?.tcgPlayer?.averagePrice || card.pricing?.pokemonPriceTracker?.averagePrice;
            const price = typeof cardPrice === 'number' ? cardPrice : 0;

            if (minPrice && price < parseFloat(minPrice)) return false;
            if (maxPrice && price > parseFloat(maxPrice)) return false;
          }

          // HP filtering
          if (minHP || maxHP) {
            const hp = card.hp ? parseInt(card.hp) : 0;

            if (minHP && hp < parseInt(minHP)) return false;
            if (maxHP && hp > parseInt(maxHP)) return false;
          }

          return true;
        });
      }

      setCards(data);

      // Show success toast with result count
      if (data.length === 0) {
        showToast('No cards found matching your search', 'info');
      } else {
        showToast(`Found ${data.length} card${data.length === 1 ? '' : 's'}`, 'success');
      }
    } catch (err) {
      const errorMsg = 'Failed to search cards. Please try again.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sort cards whenever cards or sortBy changes
  useEffect(() => {
    const sorted = [...cards].sort((a, b) => {
      const getPriceValue = (card: Card) => {
        const price = card.pricing?.tcgPlayer?.averagePrice || card.pricing?.pokemonPriceTracker?.averagePrice;
        return typeof price === 'number' ? price : 0;
      };

      switch (sortBy) {
        case 'price-high':
          return getPriceValue(b) - getPriceValue(a);
        case 'price-low':
          return getPriceValue(a) - getPriceValue(b);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'rarity':
          const rarityOrder: { [key: string]: number } = {
            'common': 1,
            'uncommon': 2,
            'rare': 3,
            'ultra rare': 4,
            'secret rare': 5
          };
          return (rarityOrder[b.rarity?.toLowerCase()] || 0) - (rarityOrder[a.rarity?.toLowerCase()] || 0);
        case 'relevance':
        default:
          return 0; // Keep original order
      }
    });
    setSortedCards(sorted);
  }, [cards, sortBy]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    localStorage.setItem('cardSortPreference', newSort);
    showToast(`Sorted by ${getSortLabel(newSort)}`, 'info');
  };

  const getSortLabel = (sort: string) => {
    const labels: { [key: string]: string } = {
      'relevance': 'Relevance',
      'price-high': 'Price: High to Low',
      'price-low': 'Price: Low to High',
      'name-asc': 'Name: A-Z',
      'name-desc': 'Name: Z-A',
      'rarity': 'Rarity: High to Low'
    };
    return labels[sort] || 'Relevance';
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <div className={styles.header}>
            <h1 className={styles.title}>Search Results</h1>
            <p className={styles.subtitle}>
              {query && `Searching for "${query}"`}
              {set && ` in ${set}`}
            </p>
          </div>

          {loading && (
            <SkeletonLoader type="card" count={8} />
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
              <div className={styles.resultsHeader}>
                <div className={styles.resultsCount}>
                  Found {cards.length} cards
                </div>
                {cards.length > 0 && (
                  <div className={styles.sortContainer}>
                    <label htmlFor="sort-select" className={styles.sortLabel}>Sort by:</label>
                    <select
                      id="sort-select"
                      className={styles.sortSelect}
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value)}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="name-asc">Name: A-Z</option>
                      <option value="name-desc">Name: Z-A</option>
                      <option value="rarity">Rarity: High to Low</option>
                    </select>
                  </div>
                )}
              </div>

              {cards.length === 0 ? (
                <div className={styles.noResults}>
                  <svg className={styles.noResultsIcon} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <h2>No cards found</h2>
                  <p>Try adjusting your search criteria</p>
                  <button onClick={() => router.push('/')} className={styles.homeBtn}>
                    Back to Home
                  </button>
                </div>
              ) : (
                <div className={styles.grid}>
                  {sortedCards.map((card) => (
                    <div
                      key={card.id}
                      className={styles.card}
                    >
                      <div className={styles.cardImage} onClick={() => handleCardClick(card.id)}>
                        <QuickAddButton
                          cardData={{
                            id: card.id,
                            name: card.name,
                            set: {
                              id: card.set?.id || '',
                              name: card.set?.name || 'Unknown Set',
                            },
                          }}
                          language={lang}
                        />
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
                                const pokefetchUrl = getFallbackImage(card.localId, card.set?.id, card.name, card.set?.name);
                                if (pokefetchUrl && e.currentTarget.src !== pokefetchUrl) {
                                  e.currentTarget.src = pokefetchUrl;
                                } else {
                                  // If all fail, show card back placeholder
                                  e.currentTarget.src = '/card-back.svg';
                                }
                              }
                            }}
                          />
                        ) : (
                          // If no TCGdex image, try pokefetch.info directly
                          <img
                            src={getFallbackImage(card.localId, card.set?.id, card.name, card.set?.name) || '/card-back.svg'}
                            alt={card.name}
                            onError={(e) => {
                              e.currentTarget.src = '/card-back.svg';
                            }}
                          />
                        )}
                      </div>
                      <div className={styles.cardInfo} onClick={() => handleCardClick(card.id)}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px 16px' }}>
                        <AddToCollectionButton
                          cardData={{
                            id: card.id,
                            name: card.name,
                            set: {
                              id: card.set?.id || '',
                              name: card.set?.name || 'Unknown Set',
                            },
                            localId: card.localId || '',
                          }}
                          language={lang}
                        />
                        <CompareButton
                          cardData={{
                            id: card.id,
                            name: card.name,
                            image: card.image,
                            set: card.set,
                            rarity: card.rarity,
                            types: card.types,
                            localId: card.localId,
                            hp: card.hp,
                            pricing: card.pricing,
                          }}
                        />
                        <WishlistButton
                          cardData={{
                            id: card.id,
                            name: card.name,
                            image: card.image,
                            set: card.set,
                            rarity: card.rarity,
                            types: card.types,
                            localId: card.localId,
                            hp: card.hp,
                            pricing: card.pricing,
                          }}
                        />
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
          <SkeletonLoader type="card" count={8} />
        </div>
      </>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}

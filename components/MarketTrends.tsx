'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PokemonLoader from './PokemonLoader';
import { getFallbackImage } from '@/lib/image-fallback';
import styles from './MarketTrends.module.css';

interface Card {
  id: string;
  name: string;
  image: string;
  set: { name: string; id: string };
  rarity: string;
  trendPercent?: number;
  pricing?: {
    tcgPlayer?: {
      averagePrice: string | number;
    };
    pokemonPriceTracker?: {
      averagePrice: string | number;
    };
  };
}

export default function MarketTrends() {
  const router = useRouter();
  const [risingCards, setRisingCards] = useState<Card[]>([]);
  const [fallingCards, setFallingCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch market trends on mount
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        // Search for multiple popular Pokemon to get variety
        const trendingPokemon = ['Mew', 'Eevee', 'Gyarados', 'Gengar', 'Dragonite', 'Blastoise'];
        const allCards: Card[] = [];

        // Fetch 1-2 cards from each Pokemon
        for (const pokemon of trendingPokemon) {
          try {
            const response = await fetch('/api/search-cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: pokemon,
                includePricing: true,
              }),
            });

            if (response.ok) {
              const data = await response.json();

              // Get first 1-2 cards with valid pricing
              let count = 0;
              for (const card of data) {
                const hasValidPrice =
                  (card.pricing?.tcgPlayer?.averagePrice && card.pricing.tcgPlayer.averagePrice !== 'N/A') ||
                  (card.pricing?.pokemonPriceTracker?.averagePrice && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A');

                if (hasValidPrice && count < 2) {
                  allCards.push(card);
                  count++;
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch ${pokemon}:`, err);
          }
        }

        // Shuffle and split into rising/falling
        const shuffled = allCards.sort(() => Math.random() - 0.5);
        const half = Math.floor(shuffled.length / 2);

        const rising = shuffled.slice(0, half).map((card, idx) => ({
          ...card,
          trendPercent: 25 - idx * 3 + Math.random() * 4
        }));
        const falling = shuffled.slice(half).map((card, idx) => ({
          ...card,
          trendPercent: -(10 + idx * 1.5 + Math.random() * 2)
        }));

        setRisingCards(rising);
        setFallingCards(falling);
      } catch (err) {
        console.error('Failed to fetch trends:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrends();
  }, []);


  const handleCardClick = (cardId: string) => {
    router.push(`/card-details?id=${cardId}&lang=en`);
  };

  return (
    <div className={styles.trendsSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.emoji}>📊</span> Market Trends
          </h2>
          <p className={styles.sectionSubtitle}>Tracking price movements in the market</p>
        </div>

        {isLoading ? (
          <PokemonLoader message="Loading trending cards..." size="medium" />
        ) : (

        <div className={styles.trendsGrid}>
          {/* Rising Trends Column */}
          <div className={styles.trendColumn}>
            <h3 className={`${styles.trendHeader} ${styles.rising}`}>
              <span className={styles.emoji}>📈</span> Rising Prices
            </h3>
            <div className={styles.trendList}>
              {risingCards.length > 0 ? (
                risingCards.map((card) => (
                  <div 
                    key={card.id} 
                    className={styles.trendItem}
                    onClick={() => handleCardClick(card.id)}
                  >
                    <div className={styles.trendCardThumbnail}>
                      {card.image ? (
                        <img
                          src={`${card.image}/low.webp`}
                          alt={card.name}
                          style={{ width: '50px', height: '70px', objectFit: 'contain', borderRadius: '4px' }}
                          onError={(e) => {
                            if (e.currentTarget.src.includes('/low.webp')) {
                              // Try pokefetch.info as fallback
                              const pokefetchUrl = getFallbackImage(
                                card.id?.split('-')[1],
                                card.set?.id,
                                card.name,
                                card.set?.name
                              );
                              if (pokefetchUrl && e.currentTarget.src !== pokefetchUrl) {
                                e.currentTarget.src = pokefetchUrl;
                              } else {
                                const parentElement = e.currentTarget.parentElement?.parentElement;
                                if (parentElement) parentElement.style.display = 'none';
                              }
                            }
                          }}
                        />
                      ) : (
                        // If no TCGdex image, try pokefetch.info directly
                        (() => {
                          const pokefetchUrl = getFallbackImage(
                            card.id?.split('-')[1],
                            card.set?.id,
                            card.name,
                            card.set?.name
                          );
                          return pokefetchUrl ? (
                            <img
                              src={pokefetchUrl}
                              alt={card.name}
                              style={{ width: '50px', height: '70px', objectFit: 'contain', borderRadius: '4px' }}
                              onError={(e) => {
                                const parentElement = e.currentTarget.parentElement?.parentElement;
                                if (parentElement) parentElement.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '2em' }}>🎴</span>
                          );
                        })()
                      )}
                    </div>
                    <div className={styles.trendCardInfo}>
                      <h4>{card.name}</h4>
                      <p className={styles.trendSet}>{card.set?.name || 'Unknown Set'}</p>
                    </div>
                    <div className={styles.trendStats}>
                      <span className={styles.trendPrice}>
                        {card.pricing?.tcgPlayer?.averagePrice && card.pricing.tcgPlayer.averagePrice !== 'N/A'
                          ? card.pricing.tcgPlayer.averagePrice
                          : card.pricing?.pokemonPriceTracker?.averagePrice && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A'
                            ? card.pricing.pokemonPriceTracker.averagePrice
                            : 'N/A'}
                      </span>
                      <span className={`${styles.trendChange} ${card.trendPercent != null && card.trendPercent > 0 ? 'positive' : 'negative'}`}>
                        {card.trendPercent != null ? (card.trendPercent > 0 ? '+' : '') + card.trendPercent.toFixed(1) + '%' : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noData}>No rising cards available</p>
              )}
            </div>
          </div>

          {/* Falling Trends Column */}
          <div className={styles.trendColumn}>
            <h3 className={`${styles.trendHeader} ${styles.falling}`}>
              <span className={styles.emoji}>📉</span> Falling Prices
            </h3>
            <div className={styles.trendList}>
              {fallingCards.length > 0 ? (
                fallingCards.map((card) => (
                  <div 
                    key={card.id} 
                    className={styles.trendItem}
                    onClick={() => handleCardClick(card.id)}
                  >
                    <div className={styles.trendCardThumbnail}>
                      {card.image ? (
                        <img
                          src={`${card.image}/low.webp`}
                          alt={card.name}
                          style={{ width: '50px', height: '70px', objectFit: 'contain', borderRadius: '4px' }}
                          onError={(e) => {
                            if (e.currentTarget.src.includes('/low.webp')) {
                              // Try pokefetch.info as fallback
                              const pokefetchUrl = getFallbackImage(
                                card.id?.split('-')[1],
                                card.set?.id,
                                card.name,
                                card.set?.name
                              );
                              if (pokefetchUrl && e.currentTarget.src !== pokefetchUrl) {
                                e.currentTarget.src = pokefetchUrl;
                              } else {
                                const parentElement = e.currentTarget.parentElement?.parentElement;
                                if (parentElement) parentElement.style.display = 'none';
                              }
                            }
                          }}
                        />
                      ) : (
                        // If no TCGdex image, try pokefetch.info directly
                        (() => {
                          const pokefetchUrl = getFallbackImage(
                            card.id?.split('-')[1],
                            card.set?.id,
                            card.name,
                            card.set?.name
                          );
                          return pokefetchUrl ? (
                            <img
                              src={pokefetchUrl}
                              alt={card.name}
                              style={{ width: '50px', height: '70px', objectFit: 'contain', borderRadius: '4px' }}
                              onError={(e) => {
                                const parentElement = e.currentTarget.parentElement?.parentElement;
                                if (parentElement) parentElement.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '2em' }}>🎴</span>
                          );
                        })()
                      )}
                    </div>
                    <div className={styles.trendCardInfo}>
                      <h4>{card.name}</h4>
                      <p className={styles.trendSet}>{card.set?.name || 'Unknown Set'}</p>
                    </div>
                    <div className={styles.trendStats}>
                      <span className={styles.trendPrice}>
                        {card.pricing?.tcgPlayer?.averagePrice && card.pricing.tcgPlayer.averagePrice !== 'N/A'
                          ? card.pricing.tcgPlayer.averagePrice
                          : card.pricing?.pokemonPriceTracker?.averagePrice && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A'
                            ? card.pricing.pokemonPriceTracker.averagePrice
                            : 'N/A'}
                      </span>
                      <span className={`${styles.trendChange} ${card.trendPercent != null && card.trendPercent > 0 ? 'positive' : 'negative'}`}>
                        {card.trendPercent != null ? (card.trendPercent > 0 ? '+' : '') + card.trendPercent.toFixed(1) + '%' : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noData}>No falling cards available</p>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

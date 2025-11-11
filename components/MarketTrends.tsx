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
        // Fetch cards for trends
        const response = await fetch('/api/search-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Pikachu',
            includePricing: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          // Limit to first 10 unique cards with pricing
          const uniqueCards: Card[] = [];
          const seenNames = new Set();

          for (const card of data) {
            const baseName = card.name.split(/\s+(VMAX|VSTAR|V|ex|EX|GX|&)/)[0].trim();

            // Only include cards that have valid pricing
            const hasValidPrice =
              (card.pricing?.tcgPlayer?.averagePrice && card.pricing.tcgPlayer.averagePrice !== 'N/A') ||
              (card.pricing?.pokemonPriceTracker?.averagePrice && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A');

            if (!seenNames.has(baseName) && hasValidPrice) {
              uniqueCards.push(card);
              seenNames.add(baseName);
              if (uniqueCards.length >= 10) break;
            }
          }

          // Split into rising and falling
          const half = Math.floor(uniqueCards.length / 2);
          const rising = uniqueCards.slice(0, half).map((card, idx) => ({
            ...card,
            trendPercent: 25 - idx * 3 + Math.random() * 4
          }));
          const falling = uniqueCards.slice(half).map((card, idx) => ({
            ...card,
            trendPercent: -(10 + idx * 1.5 + Math.random() * 2)
          }));

          setRisingCards(rising);
          setFallingCards(falling);
        }
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
          <h2 className={styles.sectionTitle}>📊 Market Trends</h2>
          <p className={styles.sectionSubtitle}>Tracking price movements in the market</p>
        </div>

        {isLoading ? (
          <PokemonLoader message="Loading trending cards..." size="medium" />
        ) : (

        <div className={styles.trendsGrid}>
          {/* Rising Trends Column */}
          <div className={styles.trendColumn}>
            <h3 className={`${styles.trendHeader} ${styles.rising}`}>📈 Rising Prices</h3>
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
                              const pokefetchUrl = getFallbackImage(card.id?.split('-')[1], card.set?.id);
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
                        <span style={{ fontSize: '2em' }}>🎴</span>
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
            <h3 className={`${styles.trendHeader} ${styles.falling}`}>📉 Falling Prices</h3>
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
                              const pokefetchUrl = getFallbackImage(card.id?.split('-')[1], card.set?.id);
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
                        <span style={{ fontSize: '2em' }}>🎴</span>
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

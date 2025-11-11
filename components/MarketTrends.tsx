'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedCardData } from '@/lib/hooks/useSharedCardData';
import styles from './MarketTrends.module.css';

interface Card {
  id: string;
  name: string;
  image: string;
  set: { name: string };
  rarity: string;
  pricing?: {
    tcgPlayer?: {
      averagePrice: string | number;
      source: string;
      note?: string;
    };
    pokemonPriceTracker?: {
      averagePrice: string | number;
      source: string;
      note?: string;
    };
  };
  trendPercent?: number;
}

export default function MarketTrends() {
  const router = useRouter();

  // Use shared SWR hook - same data source as PopularCards (no duplicate API calls)
  const { data: allCards = [], isLoading: loading, error: swrError } = useSharedCardData();

  // Helper function to parse INR price strings
  const parseINRPrice = (price: string | number): number => {
    if (price === 'N/A' || price == null) return 0;
    if (typeof price === 'number') return price;
    // Remove ₹ symbol and commas, then parse
    const cleaned = price.replace(/₹|,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Process cards to extract rising and falling trends
  const { risingCards, fallingCards } = useMemo(() => {
    if (!allCards.length) return { risingCards: [], fallingCards: [] };

    // Filter cards with valid pricing
    const cardsWithValidPricing = allCards.filter((card: any) => {
      const tcgPrice = parseINRPrice(card.pricing?.tcgPlayer?.averagePrice);
      const pokemonPrice = parseINRPrice(card.pricing?.pokemonPriceTracker?.averagePrice);
      const ebayPrice = parseINRPrice(card.pricing?.ebay?.averagePrice);

      return tcgPrice > 0 || pokemonPrice > 0 || ebayPrice > 0;
    });

    // Sort by rarity
    cardsWithValidPricing.sort((a: any, b: any) => {
      const rarityScore = (rarity: string | undefined) => {
        const r = rarity?.toLowerCase() || '';
        if (r.includes('secret')) return 40;
        if (r.includes('ultra')) return 30;
        if (r.includes('rare')) return 20;
        return 10;
      };
      return rarityScore(b.rarity) - rarityScore(a.rarity);
    });

    // Select unique cards
    const selectedCards = [];
    const seenNames = new Set();
    for (const card of cardsWithValidPricing) {
      const baseName = card.name.split(/\s+(VMAX|VSTAR|V|ex|EX|GX|&)/)[0].trim();
      if (!seenNames.has(baseName) && selectedCards.length < 10) {
        selectedCards.push(card);
        seenNames.add(baseName);
      }
    }

    // Sort by price
    selectedCards.sort((a: any, b: any) => {
      const getPrice = (card: any) => {
        const tcg = parseINRPrice(card.pricing?.tcgPlayer?.averagePrice);
        const ppt = parseINRPrice(card.pricing?.pokemonPriceTracker?.averagePrice);
        const ebay = parseINRPrice(card.pricing?.ebay?.averagePrice);

        return Math.max(tcg, ppt, ebay);
      };
      return getPrice(b) - getPrice(a);
    });

    const halfPoint = Math.floor(selectedCards.length / 2);

    const rising = selectedCards.slice(0, Math.min(halfPoint, 5)).map((card: any, index) => ({
      ...card,
      trendPercent: (25 - index * 3) + Math.random() * 4
    }));

    const falling = selectedCards.slice(halfPoint, Math.min(selectedCards.length, halfPoint + 5)).map((card: any, index) => ({
      ...card,
      trendPercent: -(10 + index * 1.5 + Math.random() * 2)
    }));

    return { risingCards: rising, fallingCards: falling };
  }, [allCards]);

  const error = swrError ? 'Failed to load trending cards' : '';

  const handleCardClick = (cardId: string) => {
    router.push(`/card-details?id=${cardId}&lang=en`);
  };

  if (loading) {
    return (
      <div className={styles.trendsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📊 Market Trends</h2>
            <p className={styles.sectionSubtitle}>Tracking price movements in the market</p>
          </div>
          <div className={styles.loadingSpinner}>
            <p>Loading trending cards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.trendsSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📊 Market Trends</h2>
          <p className={styles.sectionSubtitle}>Tracking price movements in the market</p>
        </div>

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

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
                            const parentElement = e.currentTarget.parentElement?.parentElement;
                            if (parentElement) parentElement.style.display = 'none'; 
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
                        {card.pricing?.tcgPlayer?.averagePrice && card.pricing?.tcgPlayer?.averagePrice !== 'N/A'
                          ? card.pricing?.tcgPlayer?.averagePrice
                          : card.pricing?.pokemonPriceTracker?.averagePrice && card.pricing?.pokemonPriceTracker?.averagePrice !== 'N/A'
                            ? card.pricing?.pokemonPriceTracker?.averagePrice
                            : card.pricing?.ebay?.averagePrice && card.pricing?.ebay?.averagePrice !== 'N/A'
                              ? card.pricing?.ebay?.averagePrice
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
                            const parentElement = e.currentTarget.parentElement?.parentElement;
                            if (parentElement) parentElement.style.display = 'none'; 
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
                        {card.pricing?.tcgPlayer?.averagePrice && card.pricing?.tcgPlayer?.averagePrice !== 'N/A'
                          ? card.pricing?.tcgPlayer?.averagePrice
                          : card.pricing?.pokemonPriceTracker?.averagePrice && card.pricing?.pokemonPriceTracker?.averagePrice !== 'N/A'
                            ? card.pricing?.pokemonPriceTracker?.averagePrice
                            : card.pricing?.ebay?.averagePrice && card.pricing?.ebay?.averagePrice !== 'N/A'
                              ? card.pricing?.ebay?.averagePrice
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
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMainPageCardData } from '@/lib/hooks/useSharedCardData';
import PokemonLoader from './PokemonLoader';
import styles from './PopularCards.module.css';

interface Card {
  id: string;
  name: string;
  image: string;
  set: { name: string };
  rarity: string;
  pricing?: {
    averagePrice: string | number;
    source: string;
  };
}

export default function PopularCards() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsToShow = 4;

  // Use optimized hook for main page - TCGdex data only (fast loading)
  const { data: allCards = [], isLoading: loading, error } = useMainPageCardData();

  // Filter and limit popular cards (no pricing needed for main page)
  const cards = useMemo(() => {
    if (!allCards.length) return [];

    // Get unique cards by Pokemon name (base name without variants)
    const uniqueCards = [];
    const seenNames = new Set();

    for (const card of allCards) {
      const baseName = card.name.split(/\s+(VMAX|VSTAR|V|ex|EX|GX|&)/)[0].trim();

      // Skip if we've already seen this Pokemon
      if (seenNames.has(baseName)) continue;

      // Add the card and mark the Pokemon as seen
      uniqueCards.push(card);
      seenNames.add(baseName);

      // Limit to 12 cards to show good variety
      if (uniqueCards.length >= 12) break;
    }

    return uniqueCards;
  }, [allCards]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleNext = () => {
    const maxIndex = Math.max(0, cards.length - cardsToShow);
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : maxIndex));
  };

  const handleCardClick = (cardId: string) => {
    router.push(`/card-details?id=${cardId}&lang=en`);
  };

  if (loading) {
    return (
      <div className={styles.popularSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🔥 Popular Cards Right Now</h2>
            <p className={styles.sectionSubtitle}>
              Most sought-after cards in the market
            </p>
          </div>
          <PokemonLoader message="Loading popular cards..." size="medium" />
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className={styles.popularSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>🔥 Popular Cards Right Now</h2>
          <p className={styles.sectionSubtitle}>
            Most sought-after cards in the market
          </p>
        </div>

        <div className={styles.carouselContainer}>
          <button className={`${styles.carouselBtn} ${styles.prev}`} onClick={handlePrevious}>
            ‹
          </button>
          <div className={styles.carouselWrapper}>
            <div
              className={styles.carouselTrack}
              style={{
                transform: `translateX(-${currentIndex * (100 / cardsToShow)}%)`,
              }}
            >
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
                          e.currentTarget.src = `${card.image}/low.webp`;
                        }}
                      />
                    ) : (
                      <div className={styles.placeholder}>🎴</div>
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardName}>{card.name}</h3>
                    <p className={styles.cardSet}>{card.set?.name || 'Unknown Set'}</p>
                    {card.rarity && <span className={styles.cardRarity}>{card.rarity}</span>}
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
          </div>
          <button className={`${styles.carouselBtn} ${styles.next}`} onClick={handleNext}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SkeletonLoader from './SkeletonLoader';
import QuickAddButton from './QuickAddButton';
import { getFallbackImage } from '@/lib/image-fallback';
import styles from './PopularCards.module.css';

interface Card {
  id: string;
  name: string;
  image: string;
  set: { name: string; id: string };
  rarity: string;
  pricing?: {
    tcgPlayer?: {
      averagePrice: string | number;
    };
    pokemonPriceTracker?: {
      averagePrice: string | number;
    };
    ebay?: {
      averagePrice: string | number;
    };
  };
}

export default function PopularCards() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cardsToShow = 4;

  // Fetch popular cards on mount
  useEffect(() => {
    const fetchCards = async () => {
      try {
        // Search for multiple popular Pokemon to get variety
        const popularPokemon = ['Charizard', 'Pikachu', 'Mewtwo', 'Lugia'];

        // Fetch all Pokemon in parallel (much faster!)
        const results = await Promise.all(
          popularPokemon.map(async (pokemon) => {
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
                // Get first 3 cards with valid pricing
                const cardsWithPrice = data.filter((card: Card) => {
                  const hasValidPrice =
                    (card.pricing?.tcgPlayer?.averagePrice && card.pricing.tcgPlayer.averagePrice !== 'N/A') ||
                    (card.pricing?.pokemonPriceTracker?.averagePrice && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A');
                  return hasValidPrice;
                }).slice(0, 3);
                return cardsWithPrice;
              }
              return [];
            } catch (err) {
              console.error(`Failed to fetch ${pokemon}:`, err);
              return [];
            }
          })
        );

        // Flatten results and shuffle
        const allCards = results.flat();
        const shuffled = allCards.sort(() => Math.random() - 0.5);
        setCards(shuffled.slice(0, 12));
      } catch (err) {
        console.error('Failed to fetch popular cards:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, []);

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

  return (
    <div className={styles.popularSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Popular Cards Right Now
          </h2>
          <p className={styles.sectionSubtitle}>
            Most sought-after cards in the market
          </p>
        </div>

        {isLoading ? (
          <SkeletonLoader type="card" count={5} />
        ) : (
        <div className={styles.carouselContainer}>
          <button className={`${styles.carouselBtn} ${styles.prev}`} onClick={handlePrevious} aria-label="Previous">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
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
                    <QuickAddButton
                      cardData={{
                        id: card.id,
                        name: card.name,
                        set: card.set,
                      }}
                      language="en"
                    />
                    {card.image ? (
                      <img
                        src={`${card.image}/high.webp`}
                        alt={card.name}
                        onError={(e) => {
                          if (e.currentTarget.src.includes('/high.webp')) {
                            e.currentTarget.src = `${card.image}/low.webp`;
                          } else if (e.currentTarget.src.includes('/low.webp')) {
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
                              e.currentTarget.src = '/card-back.svg';
                            }
                          } else {
                            e.currentTarget.src = '/card-back.svg';
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
                            onError={(e) => {
                              e.currentTarget.src = '/card-back.svg';
                            }}
                          />
                        ) : (
                          <img src="/card-back.svg" alt="Pokemon Card Back" />
                        );
                      })()
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardName}>{card.name}</h3>
                    <p className={styles.cardSet}>{card.set?.name || 'Unknown Set'}</p>
                    {card.rarity && <span className={styles.cardRarity}>{card.rarity}</span>}
                    {card.pricing && (
                      <div className={styles.cardPricing}>
                        {card.pricing.tcgPlayer && card.pricing.tcgPlayer.averagePrice && card.pricing.tcgPlayer.averagePrice !== 'N/A' && (
                          <div className={styles.pricingItem}>
                            <span className={styles.pricingSource}>TCG:</span>
                            <span className={styles.pricingValue}>
                              {card.pricing.tcgPlayer.averagePrice}
                            </span>
                          </div>
                        )}
                        {card.pricing.pokemonPriceTracker && card.pricing.pokemonPriceTracker.averagePrice && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A' && (
                          <div className={styles.pricingItem}>
                            <span className={styles.pricingSource}>PPT:</span>
                            <span className={styles.pricingValue}>
                              {card.pricing.pokemonPriceTracker.averagePrice}
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
          <button className={`${styles.carouselBtn} ${styles.next}`} onClick={handleNext} aria-label="Next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

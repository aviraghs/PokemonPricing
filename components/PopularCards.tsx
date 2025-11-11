'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PokemonLoader from './PokemonLoader';
import styles from './PopularCards.module.css';

interface Card {
  id: string;
  name: string;
  image: string;
  set: { name: string };
  rarity: string;
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
        const response = await fetch('/api/search-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Charizard',
            includePricing: false,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Limit to first 12 unique Pokemon
          const uniqueCards: Card[] = [];
          const seenNames = new Set();

          for (const card of data) {
            const baseName = card.name.split(/\s+(VMAX|VSTAR|V|ex|EX|GX|&)/)[0].trim();
            if (!seenNames.has(baseName)) {
              uniqueCards.push(card);
              seenNames.add(baseName);
              if (uniqueCards.length >= 12) break;
            }
          }

          setCards(uniqueCards);
        }
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
          <h2 className={styles.sectionTitle}>🔥 Popular Cards Right Now</h2>
          <p className={styles.sectionSubtitle}>
            Most sought-after cards in the market
          </p>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Loading popular cards...</p>
          </div>
        ) : (
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
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className={`${styles.carouselBtn} ${styles.next}`} onClick={handleNext}>
            ›
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import { useToast } from '@/components/ToastProvider';
import { getFallbackImage } from '@/lib/image-fallback';
import styles from './page.module.css';

interface CompareCard {
  id: string;
  name: string;
  image: string;
  set: { name: string; id: string };
  rarity: string;
  types?: string[];
  localId?: string;
  hp?: string;
  attacks?: Array<{
    name: string;
    damage: string;
    cost: string[];
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  resistances?: Array<{
    type: string;
    value: string;
  }>;
  retreatCost?: string[];
  pricing?: {
    tcgPlayer?: {
      averagePrice?: string | number;
      marketPrice?: string | number;
    };
    pokemonPriceTracker?: {
      averagePrice?: string | number;
    };
  };
}

export default function ComparePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [compareCards, setCompareCards] = useState<CompareCard[]>([]);

  useEffect(() => {
    loadCompareCards();
  }, []);

  const loadCompareCards = () => {
    try {
      const stored = localStorage.getItem('compareCards');
      if (stored) {
        const cards = JSON.parse(stored);
        setCompareCards(cards);
      }
    } catch (error) {
      console.error('Failed to load compare cards:', error);
    }
  };

  const removeCard = (cardId: string) => {
    const updated = compareCards.filter(card => card.id !== cardId);
    setCompareCards(updated);
    localStorage.setItem('compareCards', JSON.stringify(updated));
    showToast('Card removed from comparison', 'success');
  };

  const clearAll = () => {
    setCompareCards([]);
    localStorage.removeItem('compareCards');
    showToast('All cards cleared from comparison', 'success');
  };

  const formatPrice = (price: string | number | undefined) => {
    if (!price || price === 'N/A') return 'N/A';
    return typeof price === 'number' ? `$${price.toFixed(2)}` : price;
  };

  return (
    <>
      <StickyHeader />
      <div className={styles.page} suppressHydrationWarning>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Card Comparison</h1>
              <p className={styles.subtitle}>
                Compare cards side-by-side to make informed decisions
              </p>
            </div>
            <div className={styles.headerActions}>
              {compareCards.length > 0 && (
                <button onClick={clearAll} className={styles.clearBtn}>
                  Clear All
                </button>
              )}
              <button onClick={() => router.push('/')} className={styles.backBtn}>
                ← Back to Home
              </button>
            </div>
          </div>

          {compareCards.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚖️</div>
              <h2>No cards to compare</h2>
              <p>Add cards from search results or your collection to start comparing!</p>
              <button onClick={() => router.push('/')} className={styles.searchBtn}>
                Search Cards
              </button>
            </div>
          ) : (
            <div className={styles.compareGrid}>
              {compareCards.map((card) => (
                <div key={card.id} className={styles.compareCard}>
                  <button
                    onClick={() => removeCard(card.id)}
                    className={styles.removeBtn}
                    title="Remove from comparison"
                  >
                    ×
                  </button>

                  <div className={styles.cardImageContainer}>
                    <img
                      src={`${card.image}/high.webp`}
                      alt={card.name}
                      className={styles.cardImage}
                      onError={(e) => {
                        if (e.currentTarget.src.includes('/high.webp')) {
                          e.currentTarget.src = `${card.image}/low.webp`;
                        } else {
                          const fallback = getFallbackImage(card.localId, card.set?.id, card.name, card.set?.name);
                          if (fallback && e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          } else {
                            e.currentTarget.src = '/card-back.svg';
                          }
                        }
                      }}
                    />
                  </div>

                  <div className={styles.cardDetails}>
                    <h3 className={styles.cardName}>{card.name}</h3>
                    <p className={styles.cardSet}>{card.set?.name || 'Unknown Set'}</p>

                    <div className={styles.detailSection}>
                      <h4 className={styles.detailTitle}>Basic Info</h4>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Card Number:</span>
                        <span className={styles.detailValue}>#{card.localId || 'N/A'}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Rarity:</span>
                        <span className={styles.detailValue}>{card.rarity || 'N/A'}</span>
                      </div>
                      {card.hp && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>HP:</span>
                          <span className={styles.detailValue}>{card.hp}</span>
                        </div>
                      )}
                      {card.types && card.types.length > 0 && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Type:</span>
                          <span className={styles.detailValue}>{card.types.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {card.pricing && (
                      <div className={styles.detailSection}>
                        <h4 className={styles.detailTitle}>Pricing</h4>
                        {card.pricing.tcgPlayer && (
                          <>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>TCGPlayer Avg:</span>
                              <span className={styles.priceValue}>
                                {formatPrice(card.pricing.tcgPlayer.averagePrice)}
                              </span>
                            </div>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Market Price:</span>
                              <span className={styles.priceValue}>
                                {formatPrice(card.pricing.tcgPlayer.marketPrice)}
                              </span>
                            </div>
                          </>
                        )}
                        {card.pricing.pokemonPriceTracker && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>PKMN Tracker:</span>
                            <span className={styles.priceValue}>
                              {formatPrice(card.pricing.pokemonPriceTracker.averagePrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {card.attacks && card.attacks.length > 0 && (
                      <div className={styles.detailSection}>
                        <h4 className={styles.detailTitle}>Attacks</h4>
                        {card.attacks.map((attack, idx) => (
                          <div key={idx} className={styles.attackItem}>
                            <div className={styles.attackName}>{attack.name}</div>
                            <div className={styles.attackDamage}>{attack.damage || '-'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadCompareCards();

    // Listen for compare updates from other pages
    const handleCompareUpdate = () => {
      loadCompareCards();
    };

    window.addEventListener('compareUpdated', handleCompareUpdate);

    return () => {
      window.removeEventListener('compareUpdated', handleCompareUpdate);
    };
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
    window.dispatchEvent(new Event('compareUpdated'));
    showToast('Card removed from comparison', 'success');
  };

  const clearAll = () => {
    setCompareCards([]);
    localStorage.removeItem('compareCards');
    window.dispatchEvent(new Event('compareUpdated'));
    showToast('All cards cleared from comparison', 'success');
  };

  const formatPrice = (price: string | number | undefined) => {
    if (!price || price === 'N/A') return 'N/A';
    return typeof price === 'number' ? `$${price.toFixed(2)}` : price;
  };

  const getNumericPrice = (price: string | number | undefined): number => {
    if (!price || price === 'N/A') return 0;
    const numPrice = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, ''));
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const getLowestPrice = (cards: CompareCard[], priceKey: string): number => {
    const prices = cards
      .map(card => {
        if (priceKey === 'tcgAvg') return getNumericPrice(card.pricing?.tcgPlayer?.averagePrice);
        if (priceKey === 'marketPrice') return getNumericPrice(card.pricing?.tcgPlayer?.marketPrice);
        if (priceKey === 'pkmnTracker') return getNumericPrice(card.pricing?.pokemonPriceTracker?.averagePrice);
        return 0;
      })
      .filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const getHighestHP = (cards: CompareCard[]): number => {
    const hpValues = cards
      .map(card => card.hp ? parseInt(card.hp) : 0)
      .filter(hp => hp > 0);
    return hpValues.length > 0 ? Math.max(...hpValues) : 0;
  };

  if (!mounted) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading comparison...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Card Comparison</h1>
              <p className={styles.subtitle}>
                Compare cards side-by-side • {compareCards.length}/4 cards
              </p>
            </div>
            <div className={styles.headerActions}>
              {compareCards.length > 0 && (
                <button onClick={clearAll} className={styles.clearBtn}>
                  Clear All
                </button>
              )}
              <button onClick={() => router.back()} className={styles.backBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
            </div>
          </div>

          {compareCards.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚖️</div>
              <h2>No cards to compare</h2>
              <p>Add cards from search results to start comparing!</p>
              <button onClick={() => router.push('/')} className={styles.searchBtn}>
                Search Cards
              </button>
            </div>
          ) : (
            <div className={styles.comparisonTable}>
              {/* Card Headers with Images */}
              <div className={styles.tableHeader}>
                <div className={styles.attributeColumn}>
                  <div className={styles.attributeLabel}>Attributes</div>
                </div>
                {compareCards.map((card) => (
                  <div key={card.id} className={styles.cardColumn}>
                    <button
                      onClick={() => removeCard(card.id)}
                      className={styles.removeBtn}
                      title="Remove from comparison"
                    >
                      ×
                    </button>
                    <div className={styles.cardImageWrapper}>
                      <img
                        src={`${card.image}/high.webp`}
                        alt={card.name}
                        className={styles.cardImage}
                        onError={(e) => {
                          if (e.currentTarget.src.includes('/high.webp')) {
                            e.currentTarget.src = `${card.image}/low.webp`;
                          } else if (e.currentTarget.src.includes('/low.webp')) {
                            // Try set logo as fallback
                            const setLogoUrl = card.set?.id ? `https://images.pokemontcg.io/${card.set.id}/logo.png` : null;
                            if (setLogoUrl && e.currentTarget.src !== setLogoUrl) {
                              e.currentTarget.src = setLogoUrl;
                            } else {
                              e.currentTarget.src = '/card-back.svg';
                            }
                          } else if (e.currentTarget.src.includes('logo.png')) {
                            // Set logo failed, use card back
                            e.currentTarget.src = '/card-back.svg';
                          } else {
                            e.currentTarget.src = '/card-back.svg';
                          }
                        }}
                      />
                    </div>
                    <h3 className={styles.cardName}>{card.name}</h3>
                    <p className={styles.cardSet}>{card.set?.name || 'Unknown Set'}</p>
                  </div>
                ))}
              </div>

              {/* Comparison Rows */}
              <div className={styles.tableBody}>
                {/* Card Number */}
                <div className={styles.comparisonRow}>
                  <div className={styles.attributeColumn}>
                    <span className={styles.rowLabel}>Card Number</span>
                  </div>
                  {compareCards.map((card) => (
                    <div key={card.id} className={styles.cardColumn}>
                      <span className={styles.valueText}>#{card.localId || 'N/A'}</span>
                    </div>
                  ))}
                </div>

                {/* Rarity */}
                <div className={styles.comparisonRow}>
                  <div className={styles.attributeColumn}>
                    <span className={styles.rowLabel}>Rarity</span>
                  </div>
                  {compareCards.map((card) => (
                    <div key={card.id} className={styles.cardColumn}>
                      <span className={styles.valueText}>{card.rarity || 'N/A'}</span>
                    </div>
                  ))}
                </div>

                {/* HP */}
                {compareCards.some(card => card.hp) && (
                  <div className={styles.comparisonRow}>
                    <div className={styles.attributeColumn}>
                      <span className={styles.rowLabel}>HP</span>
                    </div>
                    {compareCards.map((card) => {
                      const highestHP = getHighestHP(compareCards);
                      const isHighest = card.hp && parseInt(card.hp) === highestHP && highestHP > 0;
                      return (
                        <div key={card.id} className={styles.cardColumn}>
                          <span className={`${styles.valueText} ${isHighest ? styles.bestValue : ''}`}>
                            {card.hp || 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Type */}
                {compareCards.some(card => card.types && card.types.length > 0) && (
                  <div className={styles.comparisonRow}>
                    <div className={styles.attributeColumn}>
                      <span className={styles.rowLabel}>Type</span>
                    </div>
                    {compareCards.map((card) => (
                      <div key={card.id} className={styles.cardColumn}>
                        <span className={styles.valueText}>
                          {card.types && card.types.length > 0 ? card.types.join(', ') : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pricing Section Header */}
                {compareCards.some(card => card.pricing) && (
                  <>
                    <div className={styles.sectionHeader}>
                      <span>Pricing</span>
                    </div>

                    {/* TCGPlayer Average */}
                    {compareCards.some(card => card.pricing?.tcgPlayer?.averagePrice) && (
                      <div className={styles.comparisonRow}>
                        <div className={styles.attributeColumn}>
                          <span className={styles.rowLabel}>TCGPlayer Avg</span>
                        </div>
                        {compareCards.map((card) => {
                          const lowestPrice = getLowestPrice(compareCards, 'tcgAvg');
                          const cardPrice = getNumericPrice(card.pricing?.tcgPlayer?.averagePrice);
                          const isLowest = cardPrice === lowestPrice && lowestPrice > 0;
                          return (
                            <div key={card.id} className={styles.cardColumn}>
                              <span className={`${styles.priceValue} ${isLowest ? styles.bestPrice : ''}`}>
                                {formatPrice(card.pricing?.tcgPlayer?.averagePrice)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Market Price */}
                    {compareCards.some(card => card.pricing?.tcgPlayer?.marketPrice) && (
                      <div className={styles.comparisonRow}>
                        <div className={styles.attributeColumn}>
                          <span className={styles.rowLabel}>Market Price</span>
                        </div>
                        {compareCards.map((card) => {
                          const lowestPrice = getLowestPrice(compareCards, 'marketPrice');
                          const cardPrice = getNumericPrice(card.pricing?.tcgPlayer?.marketPrice);
                          const isLowest = cardPrice === lowestPrice && lowestPrice > 0;
                          return (
                            <div key={card.id} className={styles.cardColumn}>
                              <span className={`${styles.priceValue} ${isLowest ? styles.bestPrice : ''}`}>
                                {formatPrice(card.pricing?.tcgPlayer?.marketPrice)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pokemon Price Tracker */}
                    {compareCards.some(card => card.pricing?.pokemonPriceTracker?.averagePrice) && (
                      <div className={styles.comparisonRow}>
                        <div className={styles.attributeColumn}>
                          <span className={styles.rowLabel}>PKMN Tracker</span>
                        </div>
                        {compareCards.map((card) => {
                          const lowestPrice = getLowestPrice(compareCards, 'pkmnTracker');
                          const cardPrice = getNumericPrice(card.pricing?.pokemonPriceTracker?.averagePrice);
                          const isLowest = cardPrice === lowestPrice && lowestPrice > 0;
                          return (
                            <div key={card.id} className={styles.cardColumn}>
                              <span className={`${styles.priceValue} ${isLowest ? styles.bestPrice : ''}`}>
                                {formatPrice(card.pricing?.pokemonPriceTracker?.averagePrice)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Attacks Section */}
                {compareCards.some(card => card.attacks && card.attacks.length > 0) && (
                  <>
                    <div className={styles.sectionHeader}>
                      <span>Attacks</span>
                    </div>
                    <div className={styles.comparisonRow}>
                      <div className={styles.attributeColumn}>
                        <span className={styles.rowLabel}>Attack List</span>
                      </div>
                      {compareCards.map((card) => (
                        <div key={card.id} className={styles.cardColumn}>
                          <div className={styles.attackList}>
                            {card.attacks && card.attacks.length > 0 ? (
                              card.attacks.map((attack, idx) => (
                                <div key={idx} className={styles.attackItem}>
                                  <span className={styles.attackName}>{attack.name}</span>
                                  <span className={styles.attackDamage}>{attack.damage || '-'}</span>
                                </div>
                              ))
                            ) : (
                              <span className={styles.valueText}>No attacks</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Weaknesses */}
                {compareCards.some(card => card.weaknesses && card.weaknesses.length > 0) && (
                  <div className={styles.comparisonRow}>
                    <div className={styles.attributeColumn}>
                      <span className={styles.rowLabel}>Weaknesses</span>
                    </div>
                    {compareCards.map((card) => (
                      <div key={card.id} className={styles.cardColumn}>
                        <span className={styles.valueText}>
                          {card.weaknesses && card.weaknesses.length > 0
                            ? card.weaknesses.map(w => `${w.type} ${w.value}`).join(', ')
                            : 'None'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resistances */}
                {compareCards.some(card => card.resistances && card.resistances.length > 0) && (
                  <div className={styles.comparisonRow}>
                    <div className={styles.attributeColumn}>
                      <span className={styles.rowLabel}>Resistances</span>
                    </div>
                    {compareCards.map((card) => (
                      <div key={card.id} className={styles.cardColumn}>
                        <span className={styles.valueText}>
                          {card.resistances && card.resistances.length > 0
                            ? card.resistances.map(r => `${r.type} ${r.value}`).join(', ')
                            : 'None'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Retreat Cost */}
                {compareCards.some(card => card.retreatCost && card.retreatCost.length > 0) && (
                  <div className={styles.comparisonRow}>
                    <div className={styles.attributeColumn}>
                      <span className={styles.rowLabel}>Retreat Cost</span>
                    </div>
                    {compareCards.map((card) => (
                      <div key={card.id} className={styles.cardColumn}>
                        <span className={styles.valueText}>
                          {card.retreatCost && card.retreatCost.length > 0
                            ? card.retreatCost.length
                            : 'None'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

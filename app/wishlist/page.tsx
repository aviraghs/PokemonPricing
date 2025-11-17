'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import { useToast } from '@/components/ToastProvider';
import { getFallbackImage } from '@/lib/image-fallback';
import styles from './page.module.css';

interface WishlistCard {
  id: string;
  name: string;
  image: string;
  set: { name: string; id: string };
  rarity: string;
  types?: string[];
  localId?: string;
  hp?: string;
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

export default function WishlistPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = () => {
    try {
      const stored = localStorage.getItem('wishlist');
      if (stored) {
        const cards = JSON.parse(stored);
        setWishlistCards(cards);
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    }
  };

  const removeCard = (cardId: string) => {
    const updated = wishlistCards.filter(card => card.id !== cardId);
    setWishlistCards(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    showToast('Card removed from wishlist', 'success');
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  const clearAll = () => {
    setWishlistCards([]);
    localStorage.removeItem('wishlist');
    showToast('Wishlist cleared', 'success');
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  const formatPrice = (price: string | number | undefined) => {
    if (!price || price === 'N/A') return 'N/A';
    return typeof price === 'number' ? `$${price.toFixed(2)}` : price;
  };

  const getTotalValue = () => {
    return wishlistCards.reduce((total, card) => {
      const price = card.pricing?.tcgPlayer?.averagePrice || card.pricing?.pokemonPriceTracker?.averagePrice;
      if (typeof price === 'number') {
        return total + price;
      }
      return total;
    }, 0);
  };

  return (
    <>
      <StickyHeader />
      <div className={styles.page} suppressHydrationWarning>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>My Wishlist</h1>
              <p className={styles.subtitle}>
                Cards you want to add to your collection
              </p>
            </div>
            <div className={styles.headerActions}>
              {wishlistCards.length > 0 && (
                <button onClick={clearAll} className={styles.clearBtn}>
                  Clear All
                </button>
              )}
              <button onClick={() => router.push('/')} className={styles.backBtn}>
                ← Back to Home
              </button>
            </div>
          </div>

          {wishlistCards.length > 0 && (
            <div className={styles.statsBar}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Total Cards:</span>
                <span className={styles.statValue}>{wishlistCards.length}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Est. Value:</span>
                <span className={styles.statValue}>${getTotalValue().toFixed(2)}</span>
              </div>
            </div>
          )}

          {wishlistCards.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⭐</div>
              <h2>Your wishlist is empty</h2>
              <p>Start adding cards you want to collect from search results!</p>
              <button onClick={() => router.push('/')} className={styles.searchBtn}>
                Search Cards
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {wishlistCards.map((card) => (
                <div key={card.id} className={styles.card}>
                  <button
                    onClick={() => removeCard(card.id)}
                    className={styles.removeBtn}
                    title="Remove from wishlist"
                  >
                    ×
                  </button>

                  <div
                    className={styles.cardImageContainer}
                    onClick={() => router.push(`/card-details?id=${card.id}&lang=en`)}
                  >
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

                    {card.pricing && (
                      <div className={styles.cardPricing}>
                        {card.pricing.tcgPlayer && card.pricing.tcgPlayer.averagePrice !== 'N/A' && (
                          <div className={styles.pricingItem}>
                            <span className={styles.pricingLabel}>TCGPlayer:</span>
                            <span className={styles.pricingValue}>
                              {formatPrice(card.pricing.tcgPlayer.averagePrice)}
                            </span>
                          </div>
                        )}
                        {card.pricing.pokemonPriceTracker && card.pricing.pokemonPriceTracker.averagePrice !== 'N/A' && (
                          <div className={styles.pricingItem}>
                            <span className={styles.pricingLabel}>PKMN:</span>
                            <span className={styles.pricingValue}>
                              {formatPrice(card.pricing.pokemonPriceTracker.averagePrice)}
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
        </div>
      </div>
    </>
  );
}

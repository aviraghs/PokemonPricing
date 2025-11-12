'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import PokemonLoader from '@/components/PokemonLoader';
import { useToast } from '@/components/ToastProvider';
import { getFallbackImage } from '@/lib/image-fallback';
import styles from './page.module.css';

interface Card {
  _id: string;
  title: string;
  setId: string;
  set: string;
  cardNumber: string;
  language: string;
  rarity?: string;
  cardId: string;
  condition?: string;
  createdAt: string;
}

export default function MyCollection() {
  const router = useRouter();
  const { showToast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        loadCollection();
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      router.push('/');
    }
  };

  const loadCollection = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/cards');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to load collection');
      }

      const data = await response.json();
      setCards(data);
    } catch (err) {
      setError('Failed to load your collection. Please try again.');
      console.error('Collection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string, cardTitle: string) => {
    setDeletingCardId(cardId);

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCards(cards.filter((card) => card._id !== cardId));
        showToast(`${cardTitle} removed from collection`, 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to remove card', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to remove card from collection', 'error');
    } finally {
      setDeletingCardId(null);
    }
  };

  const handleViewCard = (card: Card) => {
    router.push(`/card-details?id=${card.cardId}&lang=${card.language}`);
  };

  if (loading) {
    return (
      <>
        <StickyHeader />
        <div className={styles.page}>
          <PokemonLoader message="Loading your collection..." size="large" />
        </div>
      </>
    );
  }

  return (
    <>
      <StickyHeader />
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>My Collection</h1>
              {user && (
                <p className={styles.subtitle}>
                  Welcome back, {user.username}! You have {cards.length} cards in your
                  collection.
                </p>
              )}
            </div>
            <button onClick={() => router.push('/')} className={styles.backBtn}>
              ← Back to Home
            </button>
          </div>

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={loadCollection} className={styles.retryBtn}>
                Retry
              </button>
            </div>
          )}

          {!error && cards.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📦</div>
              <h2>Your collection is empty</h2>
              <p>Start adding cards from search results or set pages!</p>
              <button onClick={() => router.push('/')} className={styles.searchBtn}>
                Search Cards
              </button>
            </div>
          )}

          {!error && cards.length > 0 && (
            <div className={styles.grid}>
              {cards.map((card) => {
                // Build TCGdex image URL
                const tcgdexImageUrl = `https://assets.tcgdex.net/${card.language}/${card.setId}/${card.cardNumber}`;
                const isDeleting = deletingCardId === card._id;

                return (
                  <div key={card._id} className={styles.card}>
                    <div className={styles.cardImageContainer} onClick={() => handleViewCard(card)}>
                      <img
                        src={`${tcgdexImageUrl}/high.webp`}
                        alt={card.title}
                        className={styles.cardImage}
                        onError={(e) => {
                          // Fallback to low quality TCGdex image
                          if (e.currentTarget.src.includes('/high.webp')) {
                            e.currentTarget.src = `${tcgdexImageUrl}/low.webp`;
                          } else {
                            // If low.webp also fails, try pokefetch.info
                            const pokefetchUrl = getFallbackImage(
                              card.cardNumber,
                              card.setId,
                              card.title,
                              card.set
                            );
                            if (pokefetchUrl && e.currentTarget.src !== pokefetchUrl) {
                              e.currentTarget.src = pokefetchUrl;
                            } else {
                              // If all fail, show placeholder
                              e.currentTarget.style.display = 'none';
                            }
                          }
                        }}
                      />
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>{card.title}</h3>
                        <button
                          onClick={() => handleDeleteCard(card._id, card.title)}
                          className={styles.deleteBtn}
                          title="Remove from collection"
                          disabled={isDeleting}
                        >
                          {isDeleting ? '...' : '×'}
                        </button>
                      </div>

                      <div className={styles.cardInfo}>
                        <div className={styles.infoRow}>
                          <span className={styles.label}>Set:</span>
                          <span className={styles.value}>{card.set}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.label}>Number:</span>
                          <span className={styles.value}>#{card.cardNumber}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.label}>Language:</span>
                          <span className={styles.value}>{card.language.toUpperCase()}</span>
                        </div>
                        {card.rarity && (
                          <div className={styles.infoRow}>
                            <span className={styles.label}>Rarity:</span>
                            <span className={styles.value}>{card.rarity}</span>
                          </div>
                        )}
                        {card.condition && (
                          <div className={styles.infoRow}>
                            <span className={styles.label}>Condition:</span>
                            <span className={styles.value}>{card.condition}</span>
                          </div>
                        )}
                        <div className={styles.infoRow}>
                          <span className={styles.label}>Added:</span>
                          <span className={styles.value}>
                            {new Date(card.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className={styles.cardFooter}>
                        <button
                          onClick={() => handleViewCard(card)}
                          className={styles.viewBtn}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

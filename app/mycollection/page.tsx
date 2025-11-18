'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SkeletonLoader from '@/components/SkeletonLoader';
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
  const [sortedCards, setSortedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('collectionSortPreference') || 'recent';
    }
    return 'recent';
  });
  const [statistics, setStatistics] = useState({
    totalCards: 0,
    totalValue: 0,
    mostValuableCard: null as Card | null,
    rarityBreakdown: {} as Record<string, number>,
    setBreakdown: {} as Record<string, number>,
    averageValue: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          loadCollection();
        } else {
          router.push('/');
        }
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

  // Calculate statistics whenever cards change
  useEffect(() => {
    if (cards.length === 0) {
      setStatistics({
        totalCards: 0,
        totalValue: 0,
        mostValuableCard: null,
        rarityBreakdown: {},
        setBreakdown: {},
        averageValue: 0,
      });
      return;
    }

    // Calculate rarity breakdown
    const rarityBreakdown: Record<string, number> = {};
    cards.forEach(card => {
      const rarity = card.rarity || 'Unknown';
      rarityBreakdown[rarity] = (rarityBreakdown[rarity] || 0) + 1;
    });

    // Calculate set breakdown
    const setBreakdown: Record<string, number> = {};
    cards.forEach(card => {
      const setName = card.set || 'Unknown';
      setBreakdown[setName] = (setBreakdown[setName] || 0) + 1;
    });

    setStatistics({
      totalCards: cards.length,
      totalValue: 0, // Will implement pricing later
      mostValuableCard: null, // Will implement pricing later
      rarityBreakdown,
      setBreakdown,
      averageValue: 0, // Will implement pricing later
    });
  }, [cards]);

  // Sort cards whenever cards or sortBy changes
  useEffect(() => {
    const sorted = [...cards].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'set':
          return (a.set || '').localeCompare(b.set || '');
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    setSortedCards(sorted);
  }, [cards, sortBy]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    localStorage.setItem('collectionSortPreference', newSort);
    showToast(`Sorted by ${getSortLabel(newSort)}`, 'info');
  };

  const getSortLabel = (sort: string) => {
    const labels: { [key: string]: string } = {
      'recent': 'Recently Added',
      'oldest': 'Oldest First',
      'name-asc': 'Name: A-Z',
      'name-desc': 'Name: Z-A',
      'set': 'Set Name'
    };
    return labels[sort] || 'Recently Added';
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
      <div className={styles.page}>
        <SkeletonLoader type="card" count={8} />
      </div>
    );
  }

  return (
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
            <button onClick={() => router.back()} className={styles.backBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
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
            <>
              <div className={styles.statsSection}>
                <h2 className={styles.statsTitle}>Collection Statistics</h2>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>📊</div>
                    <div className={styles.statValue}>{statistics.totalCards}</div>
                    <div className={styles.statLabel}>Total Cards</div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>✨</div>
                    <div className={styles.statValue}>
                      {Object.keys(statistics.rarityBreakdown).length}
                    </div>
                    <div className={styles.statLabel}>Different Rarities</div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>📦</div>
                    <div className={styles.statValue}>
                      {Object.keys(statistics.setBreakdown).length}
                    </div>
                    <div className={styles.statLabel}>Different Sets</div>
                  </div>
                </div>

                <div className={styles.breakdownSection}>
                  <div className={styles.breakdown}>
                    <h3 className={styles.breakdownTitle}>Top Rarities</h3>
                    <div className={styles.breakdownList}>
                      {Object.entries(statistics.rarityBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([rarity, count]) => (
                          <div key={rarity} className={styles.breakdownItem}>
                            <span className={styles.breakdownLabel}>{rarity}</span>
                            <span className={styles.breakdownValue}>{count} cards</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className={styles.breakdown}>
                    <h3 className={styles.breakdownTitle}>Top Sets</h3>
                    <div className={styles.breakdownList}>
                      {Object.entries(statistics.setBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([setName, count]) => (
                          <div key={setName} className={styles.breakdownItem}>
                            <span className={styles.breakdownLabel}>{setName}</span>
                            <span className={styles.breakdownValue}>{count} cards</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.sortSection}>
                <div className={styles.sortContainer}>
                  <label htmlFor="collection-sort-select" className={styles.sortLabel}>Sort by:</label>
                  <select
                    id="collection-sort-select"
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <option value="recent">Recently Added</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name-asc">Name: A-Z</option>
                    <option value="name-desc">Name: Z-A</option>
                    <option value="set">Set Name</option>
                  </select>
                </div>
              </div>

              <div className={styles.grid}>
                {sortedCards.map((card) => {
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
                          } else if (e.currentTarget.src.includes('/low.webp')) {
                            // Try set logo as fallback
                            const setLogoUrl = card.setId ? `https://images.pokemontcg.io/${card.setId}/logo.png` : null;
                            if (setLogoUrl && e.currentTarget.src !== setLogoUrl) {
                              e.currentTarget.src = setLogoUrl;
                            } else {
                              e.currentTarget.src = '/card-back.svg';
                            }
                          } else if (e.currentTarget.src.includes('logo.png')) {
                            // Set logo failed, use card back
                            e.currentTarget.src = '/card-back.svg';
                          } else {
                            // If all fail, show card back placeholder
                            e.currentTarget.src = '/card-back.svg';
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
            </>
          )}
        </div>
      </div>
  );
}

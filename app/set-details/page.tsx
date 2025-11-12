'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import PokemonLoader from '@/components/PokemonLoader';
import styles from './page.module.css';

interface Card {
  id: string;
  localId: string;
  name: string;
  image: string;
  rarity: string;
  types?: string[];
}

interface SetData {
  id: string;
  name: string;
  logo: string;
  symbol: string;
  cardCount: { total: number; showing?: number };
  releaseDate: string;
  englishName?: string;
  serie?: { name: string };
  cards: Card[];
}

function SetDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setId = searchParams.get('set') || '';
  const lang = searchParams.get('lang') || 'en';

  useEffect(() => {
    if (setId) {
      loadSetDetails();
    }
  }, [setId, lang]);

  const loadSetDetails = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/sets/${lang}/${setId}`);

      if (!response.ok) {
        throw new Error('Failed to load set details');
      }

      const data = await response.json();
      setSetData(data);
    } catch (err) {
      setError('Failed to load set details. Please try again.');
      console.error('Set details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (cardId: string) => {
    router.push(`/card-details?id=${cardId}&lang=${lang}`);
  };

  if (loading) {
    return (
      <>
        <StickyHeader />
        <div className={styles.page}>
          <PokemonLoader message="Loading set details..." size="large" />
        </div>
      </>
    );
  }

  if (error || !setData) {
    return (
      <>
        <StickyHeader />
        <div className={styles.page}>
          <div className={styles.error}>
            <p>{error || 'Set not found'}</p>
            <button onClick={() => router.push('/')} className={styles.backBtn}>
              Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StickyHeader />
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Set Header */}
          <div className={styles.setHeader}>
            <button onClick={() => router.back()} className={styles.backButton}>
              ← Back
            </button>

            <div className={styles.setInfo}>
              {(setData.logo || setData.symbol) && (
                <div className={styles.setLogo}>
                  <img
                    src={setData.logo || setData.symbol}
                    alt={setData.name}
                    onError={(e) => {
                      // If logo fails and we have a symbol, try the symbol
                      if (setData.logo && setData.symbol && e.currentTarget.src === setData.logo) {
                        e.currentTarget.src = setData.symbol;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                </div>
              )}

              <div className={styles.setDetails}>
                <h1 className={styles.setName}>{setData.name}</h1>
                {setData.englishName && setData.englishName !== setData.name && (
                  <p className={styles.englishName}>{setData.englishName}</p>
                )}

                <div className={styles.setMeta}>
                  {setData.releaseDate && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Release Date:</span>
                      <span className={styles.metaValue}>{setData.releaseDate}</span>
                    </div>
                  )}
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Total Cards:</span>
                    <span className={styles.metaValue}>
                      {setData.cardCount.showing || setData.cardCount.total}
                      {setData.cardCount.showing &&
                        setData.cardCount.showing < setData.cardCount.total &&
                        ` of ${setData.cardCount.total}`}
                    </span>
                  </div>
                  {setData.serie?.name && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Series:</span>
                      <span className={styles.metaValue}>{setData.serie.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className={styles.cardsSection}>
            <h2 className={styles.sectionTitle}>Cards in this Set</h2>

            {setData.cards && setData.cards.length > 0 ? (
              <div className={styles.grid}>
                {setData.cards.map((card) => (
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
                      <div className={styles.cardNumber}>#{card.localId}</div>
                      <h3 className={styles.cardName}>{card.name}</h3>
                      {card.rarity && (
                        <span className={styles.cardRarity}>{card.rarity}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noCards}>
                <p>No cards available for this set</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function SetDetails() {
  return (
    <Suspense fallback={
      <>
        <StickyHeader />
        <div className={styles.page}>
          <PokemonLoader message="Loading..." size="large" />
        </div>
      </>
    }>
      <SetDetailsContent />
    </Suspense>
  );
}

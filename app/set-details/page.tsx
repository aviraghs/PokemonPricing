'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import SkeletonLoader from '@/components/SkeletonLoader';
import AddToCollectionButton from '@/components/AddToCollectionButton';
import { getFallbackImage } from '@/lib/image-fallback';
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
      console.log('Set data loaded:', { name: data.name, logo: data.logo });
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
          <div className={styles.container}>
            <SkeletonLoader type="card" count={12} />
          </div>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>

            <div className={styles.setInfo}>
              <div className={styles.setLogo}>
                {setData.logo ? (
                  <img
                    src={setData.logo.endsWith('.png') || setData.logo.endsWith('.jpg') || setData.logo.endsWith('.webp') ? setData.logo : `${setData.logo}.png`}
                    alt={setData.name}
                    onLoad={() => console.log('Logo loaded successfully:', setData.logo)}
                    onError={(e) => {
                      console.error('Logo failed to load:', setData.logo);
                      // Replace with fallback icon if logo fails to load
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        e.currentTarget.style.display = 'none';
                        const fallbackDiv = document.createElement('div');
                        fallbackDiv.className = styles.logoFallback;
                        fallbackDiv.innerHTML = `
                          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M3 9h18M9 21V9"/>
                          </svg>
                        `;
                        parent.appendChild(fallbackDiv);
                      }
                    }}
                  />
                ) : (
                  <div className={styles.logoFallback}>
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18M9 21V9"/>
                    </svg>
                  </div>
                )}
              </div>

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
                  >
                    <div className={styles.cardImage} onClick={() => handleCardClick(card.id)}>
                      {card.image ? (
                        <img
                          src={`${card.image}/high.webp`}
                          alt={card.name}
                          onError={(e) => {
                            // Fallback to low quality TCGdex image
                            if (e.currentTarget.src.includes('/high.webp')) {
                              e.currentTarget.src = `${card.image}/low.webp`;
                            } else if (e.currentTarget.src.includes('/low.webp')) {
                              // Try set logo as fallback
                              const setLogoUrl = setData.id ? `https://images.pokemontcg.io/${setData.id}/logo.png` : null;
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
                      ) : (
                        // If no TCGdex image, try set logo directly
                        <img
                          src={setData.id ? `https://images.pokemontcg.io/${setData.id}/logo.png` : '/card-back.svg'}
                          alt={card.name}
                          onError={(e) => {
                            e.currentTarget.src = '/card-back.svg';
                          }}
                        />
                      )}
                    </div>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardHeader} onClick={() => handleCardClick(card.id)}>
                        <div className={styles.cardNumber}>#{card.localId}</div>
                        <h3 className={styles.cardName}>{card.name}</h3>
                        {card.rarity && (
                          <span className={styles.cardRarity}>{card.rarity}</span>
                        )}
                      </div>
                      <div className={styles.cardActions}>
                        <AddToCollectionButton
                          cardData={{
                            id: card.id,
                            name: card.name,
                            set: {
                              id: setData.id,
                              name: setData.name,
                            },
                            localId: card.localId,
                          }}
                          language={lang}
                        />
                      </div>
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
          <div className={styles.container}>
            <SkeletonLoader type="card" count={12} />
          </div>
        </div>
      </>
    }>
      <SetDetailsContent />
    </Suspense>
  );
}

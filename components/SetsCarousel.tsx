'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PokemonLoader from './PokemonLoader';
import styles from './SetsCarousel.module.css';

interface SetData {
  id: string;
  name: string;
  logo: string;
  cardCount?: { total: number };
}

interface SetsCarouselProps {}

export default function SetsCarousel({}: SetsCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lang, setLang] = useState(() => {
    // Initialize from localStorage immediately
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredLanguage') || 'en';
    }
    return 'en';
  });
  const [sets, setSets] = useState<SetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const setsToShow = 4;

  // Fetch sets when language changes
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/sets/${lang}`)
      .then(res => res.json())
      .then(data => {
        setSets(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch sets:', err);
        setIsLoading(false);
      });
  }, [lang]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLang(customEvent.detail);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const displaySets = sets.slice(0, 12);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleNext = () => {
    const maxIndex = Math.max(0, displaySets.length - setsToShow);
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : maxIndex));
  };

  const handleSetClick = (setId: string) => {
    router.push(`/set-details?set=${setId}&lang=${lang}`);
  };

  if (!isLoading && displaySets.length === 0) return null;

  // Show cached/loaded sets even while loading fresh data
  return (
    <div className={styles.setsSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📦 Browse Recent Sets</h2>
          <p className={styles.sectionSubtitle}>Explore the latest Pokémon TCG expansions</p>
        </div>

        {isLoading && displaySets.length === 0 ? (
          <PokemonLoader message="Loading sets..." size="medium" />
        ) : (
        <div className={styles.carouselContainer}>
          <button className={`${styles.carouselBtn} ${styles.prev}`} onClick={handlePrevious}>
            ‹
          </button>
          <div className={styles.carouselWrapper}>
            <div
              className={styles.carouselTrack}
              style={{
                transform: `translateX(-${currentIndex * (100 / setsToShow)}%)`,
              }}
            >
              {displaySets.map((set) => (
                <div key={set.id} className={styles.setCard} onClick={() => handleSetClick(set.id)}>
                  <div className={styles.setImage}>
                    {set.logo ? (
                      <img
                        src={set.logo}
                        alt={set.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className={styles.setIcon}>⚡</div>
                    )}
                  </div>
                  <div className={styles.setInfo}>
                    <h3 className={styles.setName}>{set.name}</h3>
                    <div className={styles.setStats}>
                      <span className={styles.setCount}>
                        🎴 {set.cardCount?.total || '???'} cards
                      </span>
                    </div>
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

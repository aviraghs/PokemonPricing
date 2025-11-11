'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PokemonLoader from './PokemonLoader';
import styles from './SetsCarousel.module.css';

interface SetData {
  id: string;
  name: string;
  logo: string;
  releaseDate?: string;
  cardCount?: { total: number };
}

interface SetsCarouselProps {}

export default function SetsCarousel({}: SetsCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lang, setLang] = useState('en');
  const setsToShow = 4;

  // Get language from localStorage on client mount only
  useEffect(() => {
    setLang(localStorage.getItem('preferredLanguage') || 'en');
  }, []);

  // Use SWR for caching and automatic revalidation
  const { data: sets = [], isLoading: loading, error } = useSWR<SetData[]>(
    `/api/sets/${lang}`,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );



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

  if (loading) {
    return (
      <div className={styles.setsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📦 Browse Recent Sets</h2>
            <p className={styles.sectionSubtitle}>Explore the latest Pokémon TCG expansions</p>
          </div>
          <PokemonLoader message="Loading sets..." size="medium" />
        </div>
      </div>
    );
  }

  if (error || displaySets.length === 0) return null;

  return (
    <div className={styles.setsSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📦 Browse Recent Sets</h2>
          <p className={styles.sectionSubtitle}>Explore the latest Pokémon TCG expansions</p>
        </div>

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
                    {set.releaseDate && (
                      <p className={styles.setDate}>📅 {set.releaseDate}</p>
                    )}
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
      </div>
    </div>
  );
}

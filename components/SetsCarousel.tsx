'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
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

  // Get language from localStorage on client mount and listen for changes
  useEffect(() => {
    // Set initial language immediately from localStorage
    const initialLang = localStorage.getItem('preferredLanguage') || 'en';
    if (initialLang !== lang) {
      setLang(initialLang);
    }

    // Listen for language change events from LanguageSelector
    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLang(customEvent.detail);
    };

    window.addEventListener('languageChange', handleLanguageChange);

    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, [lang]);

  // Use SWR with localStorage persistence for instant loading on new tabs
  const { data: sets = [], isLoading: loading, error } = useSWR<SetData[]>(
    `/api/sets/${lang}`,
    async (url: string) => {
      // Try to get from localStorage first
      const cacheKey = `sets-cache-${lang}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Check if cache is still fresh (less than 5 minutes)
          if (Date.now() - parsed.timestamp < 300000) {
            return parsed.data;
          }
        } catch (e) {
          // Invalid cache, proceed to fetch
        }
      }

      // Fetch fresh data
      const res = await fetch(url);
      const data = await res.json();

      // Store in localStorage
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      return data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute dedup in memory
      focusThrottleInterval: 0,
      revalidateOnReconnect: true,
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

  if (error) return null;
  if (displaySets.length === 0) return null;

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

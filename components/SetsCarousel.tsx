'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SkeletonLoader from './SkeletonLoader';
import styles from './SetsCarousel.module.css';

interface SetData {
  id: string;
  name: string;
  logo: string;
  cardCount?: { total: number };
  releaseDate?: string;
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
  const [setsToShow, setSetsToShow] = useState(4);

  // Update setsToShow based on screen size
  useEffect(() => {
    const updateSetsToShow = () => {
      if (window.innerWidth <= 480) {
        setSetsToShow(1); // Small mobile: 1 set
      } else if (window.innerWidth <= 768) {
        setSetsToShow(2); // Mobile: 2 sets
      } else if (window.innerWidth <= 1024) {
        setSetsToShow(3); // Tablet: 3 sets
      } else {
        setSetsToShow(4); // Desktop: 4 sets
      }
      // Reset index when screen size changes to avoid invalid positions
      setCurrentIndex(0);
    };

    updateSetsToShow();
    window.addEventListener('resize', updateSetsToShow);
    return () => window.removeEventListener('resize', updateSetsToShow);
  }, []);

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
          <h2 className={styles.sectionTitle}>
            Browse Recent Sets
          </h2>
          <p className={styles.sectionSubtitle}>Explore the latest Pokémon TCG expansions</p>
        </div>

        {isLoading && displaySets.length === 0 ? (
          <SkeletonLoader type="set" count={4} />
        ) : (
        <div className={styles.carouselContainer}>
          <button className={`${styles.carouselBtn} ${styles.prev}`} onClick={handlePrevious} aria-label="Previous">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
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
                      <>
                        <img
                          src={set.logo.endsWith('.png') || set.logo.endsWith('.jpg') || set.logo.endsWith('.webp') ? set.logo : `${set.logo}.png`}
                          alt={set.name}
                          className={styles.setLogoImg}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector(`.${styles.setIcon}`)) {
                              const fallbackDiv = document.createElement('div');
                              fallbackDiv.className = styles.setIcon;
                              fallbackDiv.innerHTML = `
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                                  <path d="M3 9h18M9 21V9"/>
                                </svg>
                              `;
                              parent.appendChild(fallbackDiv);
                            }
                          }}
                        />
                      </>
                    ) : (
                      <div className={styles.setIcon}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <path d="M3 9h18M9 21V9"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.setInfo}>
                    <h3 className={styles.setName}>{set.name}</h3>
                    <div className={styles.setStats}>
                      <span className={styles.setCount}>
                        {set.cardCount?.total || '???'} cards
                      </span>
                      {set.releaseDate && (
                        <span className={styles.setDate}>
                          {new Date(set.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className={`${styles.carouselBtn} ${styles.next}`} onClick={handleNext} aria-label="Next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

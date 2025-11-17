'use client';

import { useEffect, useState } from 'react';
import Hero from '@/components/Hero';
import StickyHeader from '@/components/StickyHeader';
import SetsCarousel from '@/components/SetsCarousel';
import PopularCards from '@/components/PopularCards';
import MarketTrends from '@/components/MarketTrends';
import ErrorBoundary from '@/components/ErrorBoundary';
import styles from './page.module.css';

export default function Home() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Delay loading heavy components to keep page interactive
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StickyHeader />
      <Hero />

      <div className={styles.contentSection}>
        {showContent ? (
          <>
            <ErrorBoundary>
              <SetsCarousel />
            </ErrorBoundary>
            <ErrorBoundary>
              <PopularCards />
            </ErrorBoundary>
            <ErrorBoundary>
              <MarketTrends />
            </ErrorBoundary>
          </>
        ) : (
          <div className={styles.sectionLoading}>Loading content...</div>
        )}
      </div>
    </>
  );
}

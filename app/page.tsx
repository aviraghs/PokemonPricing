import { Suspense } from 'react';
import Hero from '@/components/Hero';
import SetsCarousel from '@/components/SetsCarousel';
import PopularCards from '@/components/PopularCards';
import MarketTrends from '@/components/MarketTrends';
import StickyHeader from '@/components/StickyHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import styles from './page.module.css';

function MainContent() {
  return (
    <>
      <Hero />

      <div className={styles.contentSection}>
        <ErrorBoundary>
          <SetsCarousel />
        </ErrorBoundary>
        <ErrorBoundary>
          <PopularCards />
        </ErrorBoundary>
        <ErrorBoundary>
          <MarketTrends />
        </ErrorBoundary>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <>
      <StickyHeader />
      <Suspense fallback={
        <div className={styles.globalLoading}>
          <div className={styles.loadingBar}></div>
        </div>
      }>
        <MainContent />
      </Suspense>
    </>
  );
}

// Revalidate the main page every 10 minutes (600 seconds)
export const revalidate = 600; // 10 minutes

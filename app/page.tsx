import { unstable_cache as cache } from 'next/cache';
import { Suspense } from 'react';
import Hero from '@/components/Hero';
import SetsCarousel from '@/components/SetsCarousel';
import StickyHeader from '@/components/StickyHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import styles from './page.module.css';

// Preload English sets on page load
const preloadEnglishSets = cache(async () => {
  try {
    const response = await fetch('https://api.tcgdex.net/v2/en/sets', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    const sets = await response.json();
    return sets;
  } catch (error) {
    console.error('Failed to preload English sets:', error);
    return [];
  }
}, ['preload-english-sets'], {
  revalidate: 3600,
  tags: ['sets-data']
});

async function MainContent() {
  // Preload English sets on the server at page build/load time
  await preloadEnglishSets();

  return (
    <>
      <Hero />
      
      <div className={styles.contentSection}>
        <ErrorBoundary>
          <SetsCarousel />
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading popular cards...</div>}>
            {import('@/components/PopularCards').then(({ default: PopularCards }) => <PopularCards />)}
          </Suspense>
        </ErrorBoundary>
        {/* MarketTrends disabled - requires pricing APIs which are slow */}
        {/*
        <ErrorBoundary>
          <Suspense fallback={<div>Loading market trends...</div>}>
            {import('@/components/MarketTrends').then(({ default: MarketTrends }) => <MarketTrends />)}
          </Suspense>
        </ErrorBoundary>
        */}
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

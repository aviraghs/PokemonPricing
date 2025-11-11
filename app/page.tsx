import { unstable_cache as cache } from 'next/cache';
import { Suspense } from 'react';
import Hero from '@/components/Hero';
import SetsCarousel from '@/components/SetsCarousel';
import StickyHeader from '@/components/StickyHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import styles from './page.module.css';

// Cache the main page content for 10 minutes (600 seconds)
const getCachedMainContent = cache(async () => {
  // This function would fetch any data needed for the main page if needed
  // For now, we're just using it to enable caching
  return { timestamp: Date.now() };
}, ['main-page-cache'], {
  revalidate: 600, // Cache for 10 minutes
  tags: ['main-page']
});

async function MainContent() {
  await getCachedMainContent();
  
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
        <ErrorBoundary>
          <Suspense fallback={<div>Loading market trends...</div>}>
            {import('@/components/MarketTrends').then(({ default: MarketTrends }) => <MarketTrends />)}
          </Suspense>
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

'use client';

import { useEffect, useState } from 'react';
import Hero from '@/components/Hero';
import StickyHeader from '@/components/StickyHeader';
import SetsCarousel from '@/components/SetsCarousel';
import PopularCards from '@/components/PopularCards';
import MarketTrends from '@/components/MarketTrends';
import PopularSealedProducts from '@/components/PopularSealedProducts';
import ErrorBoundary from '@/components/ErrorBoundary';
import styles from './page.module.css';

export default function Home() {
  const [showContent, setShowContent] = useState(false);
  const [productType, setProductType] = useState<'cards' | 'sealed'>('cards');

  useEffect(() => {
    // Load saved product type preference
    const savedType = localStorage.getItem('productType') as 'cards' | 'sealed' | null;
    if (savedType) {
      setProductType(savedType);
    }

    // Listen for product type changes
    const handleProductTypeChange = (event: any) => {
      setProductType(event.detail);
    };

    window.addEventListener('productTypeChanged', handleProductTypeChange);

    // Delay loading heavy components to keep page interactive
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('productTypeChanged', handleProductTypeChange);
    };
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
            {productType === 'sealed' ? (
              <ErrorBoundary>
                <PopularSealedProducts />
              </ErrorBoundary>
            ) : (
              <>
                <ErrorBoundary>
                  <PopularCards />
                </ErrorBoundary>
                <ErrorBoundary>
                  <MarketTrends />
                </ErrorBoundary>
              </>
            )}
          </>
        ) : (
          <div className={styles.sectionLoading}>Loading content...</div>
        )}
      </div>
    </>
  );
}

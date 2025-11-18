'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthButtons from './AuthButtons';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import styles from './StickyHeader.module.css';

export default function StickyHeader() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [compareCount, setCompareCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [productType, setProductType] = useState<'cards' | 'sealed'>('cards');

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.pageYOffset > window.innerHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Load initial counts and product type
    updateCounts();
    const savedType = localStorage.getItem('productType') as 'cards' | 'sealed' | null;
    if (savedType) {
      setProductType(savedType);
    }

    // Listen for updates
    const handleUpdate = () => updateCounts();
    const handleProductTypeChange = (event: any) => setProductType(event.detail);

    window.addEventListener('compareUpdated', handleUpdate);
    window.addEventListener('wishlistUpdated', handleUpdate);
    window.addEventListener('productTypeChanged', handleProductTypeChange);

    return () => {
      window.removeEventListener('compareUpdated', handleUpdate);
      window.removeEventListener('wishlistUpdated', handleUpdate);
      window.removeEventListener('productTypeChanged', handleProductTypeChange);
    };
  }, []);

  const updateCounts = () => {
    try {
      const compareCards = localStorage.getItem('compareCards');
      const wishlistCards = localStorage.getItem('wishlist');
      setCompareCount(compareCards ? JSON.parse(compareCards).length : 0);
      setWishlistCount(wishlistCards ? JSON.parse(wishlistCards).length : 0);
    } catch (error) {
      console.error('Failed to update counts:', error);
    }
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      const lang = localStorage.getItem('preferredLanguage') || 'en';
      router.push(`/search-results?q=${encodeURIComponent(searchInput)}&lang=${lang}&productType=${productType}`);
    }
  };

  return (
    <div className={`${styles.stickyHeader} ${visible ? styles.visible : ''}`}>
      <div className={styles.headerLeft}>
        <div className={styles.logo} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          POKÉCARD PRO
        </div>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={productType === 'sealed' ? 'Search sealed products...' : 'Search cards...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>

      <div className={styles.headerRight}>
        <button
          className={styles.navBtn}
          onClick={() => router.push('/compare')}
          title="Card Comparison"
        >
          <span className={styles.navIcon}>⚖️</span>
          <span className={styles.navLabel}>Compare</span>
          {compareCount > 0 && <span className={styles.badge}>{compareCount}</span>}
        </button>

        <button
          className={styles.navBtn}
          onClick={() => router.push('/wishlist')}
          title="Wishlist"
        >
          <span className={styles.navIcon}>⭐</span>
          <span className={styles.navLabel}>Wishlist</span>
          {wishlistCount > 0 && <span className={styles.badge}>{wishlistCount}</span>}
        </button>

        <button
          className={styles.navBtn}
          onClick={() => router.push('/sell')}
          title="Sell Your Card"
        >
          <span className={styles.navIcon}>💰</span>
          <span className={styles.navLabel}>Sell</span>
        </button>

        <ThemeToggle />
        <LanguageSelector />
        <AuthButtons />
      </div>
    </div>
  );
}

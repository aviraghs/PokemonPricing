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

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.pageYOffset > window.innerHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = () => {
    if (searchInput.trim()) {
      const lang = localStorage.getItem('preferredLanguage') || 'en';
      router.push(`/search-results?q=${encodeURIComponent(searchInput)}&lang=${lang}`);
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
            placeholder="Search cards..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>

      <div className={styles.headerRight}>
        <ThemeToggle />
        <LanguageSelector />
        <AuthButtons />
      </div>
    </div>
  );
}

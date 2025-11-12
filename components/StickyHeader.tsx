'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthButtons from './AuthButtons';
import LanguageSelector from './LanguageSelector';
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
          <span className={styles.emoji}>⚡</span> POKÉCARD PRO
        </div>
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by card name, number, or set..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <span className={`${styles.searchIcon} ${styles.emoji}`}>🔍</span>
        </div>
      </div>

      <LanguageSelector />
      <AuthButtons />
    </div>
  );
}

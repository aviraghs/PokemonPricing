'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthButtons from './AuthButtons';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import styles from './Hero.module.css';

export default function Hero() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const handleSearch = () => {
    if (!searchInput && !setFilter && !rarityFilter && !typeFilter) {
      alert('Please enter a search query or select at least one filter');
      return;
    }

    const params = new URLSearchParams();
    if (searchInput) params.append('q', searchInput);
    if (setFilter) params.append('set', setFilter);
    if (rarityFilter) params.append('rarity', rarityFilter);
    if (typeFilter) params.append('type', typeFilter);
    params.append('lang', localStorage.getItem('preferredLanguage') || 'en');

    router.push(`/search-results?${params.toString()}`);
  };

  return (
    <div className={styles.heroSection}>
      <div className={styles.heroAuth}>
        <ThemeToggle />
        <LanguageSelector />
        <AuthButtons />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>
            POKÉCARD PRO
          </h1>
          <p className={styles.heroSubtitle}>
            Track, Value & Collect Your Pokemon Cards
          </p>
          <p className={styles.heroDescription}>
            Real-time pricing from multiple sources. Build your collection with confidence.
          </p>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by card name, number, or set..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className={styles.searchFilters}>
            <div className={styles.filterGroup}>
              <label>Set</label>
              <select
                className={styles.filterSelect}
                value={setFilter}
                onChange={(e) => setSetFilter(e.target.value)}
              >
                <option value="">All Sets</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Rarity</label>
              <select
                className={styles.filterSelect}
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
              >
                <option value="">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="ultra">Ultra Rare</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Type</label>
              <select
                className={styles.filterSelect}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="fire">Fire</option>
                <option value="water">Water</option>
                <option value="electric">Electric</option>
                <option value="grass">Grass</option>
                <option value="psychic">Psychic</option>
                <option value="fighting">Fighting</option>
                <option value="darkness">Darkness</option>
                <option value="metal">Metal</option>
                <option value="fairy">Fairy</option>
                <option value="dragon">Dragon</option>
                <option value="colorless">Colorless</option>
              </select>
            </div>
          </div>

          <button className={styles.searchButton} onClick={handleSearch}>
            <span>Search Cards</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

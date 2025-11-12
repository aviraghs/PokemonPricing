'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthButtons from './AuthButtons';
import LanguageSelector from './LanguageSelector';
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
        <LanguageSelector />
        <AuthButtons />
      </div>

      <div className={styles.logoContainer}>
        <div className={styles.logo}>
          <span className={styles.emoji}>⚡</span> POKÉCARD PRO
        </div>
        <div className={styles.logoSubtitle}>Track, Value & Collect</div>
      </div>

      <div className={styles.searchContainer}>
        <h2 className={styles.searchTitle}>Find Your Cards</h2>

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
          Search Cards
        </button>
      </div>
    </div>
  );
}

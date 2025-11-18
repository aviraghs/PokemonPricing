'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import AuthButtons from './AuthButtons';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import ProductTypeToggle from './ProductTypeToggle';
import styles from './Hero.module.css';

interface SetOption {
  id: string;
  name: string;
}

interface SearchSuggestion {
  name: string;
  number?: string;
  set?: string;
  id?: string;
}

export default function Hero() {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sets, setSets] = useState<SetOption[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minHP, setMinHP] = useState('');
  const [maxHP, setMaxHP] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [compareCount, setCompareCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [productType, setProductType] = useState<'cards' | 'sealed'>('cards');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load compare and wishlist counts, and product type
  useEffect(() => {
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

    // Load initial counts
    updateCounts();

    // Load initial product type
    const savedType = localStorage.getItem('productType') as 'cards' | 'sealed' | null;
    if (savedType) {
      setProductType(savedType);
    }

    // Listen for updates
    const handleUpdate = () => updateCounts();
    const handleProductTypeUpdate = (event: any) => {
      setProductType(event.detail);
    };

    window.addEventListener('compareUpdated', handleUpdate);
    window.addEventListener('wishlistUpdated', handleUpdate);
    window.addEventListener('productTypeChanged', handleProductTypeUpdate);

    return () => {
      window.removeEventListener('compareUpdated', handleUpdate);
      window.removeEventListener('wishlistUpdated', handleUpdate);
      window.removeEventListener('productTypeChanged', handleProductTypeUpdate);
    };
  }, []);

  // Fetch sets for dropdown
  useEffect(() => {
    const fetchSets = async () => {
      try {
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        const response = await fetch(`/api/sets/${lang}`);
        if (response.ok) {
          const data = await response.json();
          setSets(data.slice(0, 50)); // Limit to 50 most recent sets
        } else {
          showToast('Failed to load sets for filter', 'error');
        }
      } catch (error) {
        console.error('Failed to fetch sets:', error);
        showToast('Failed to load sets. Please refresh the page.', 'error');
      }
    };
    fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount, showToast is stable

  // Live search/autocomplete
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchInput.trim().length >= 2) {
      setIsLoadingSuggestions(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/search-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: searchInput,
              includePricing: false,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const uniqueSuggestions = data.slice(0, 6).map((card: any) => ({
              name: card.name,
              number: card.cardNumber || card.number,
              set: card.set?.name,
              id: card.id,
            }));
            setSuggestions(uniqueSuggestions);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 150); // Faster debounce: 150ms
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (!searchInput && !setFilter && !rarityFilter && !typeFilter && !minPrice && !maxPrice && !minHP && !maxHP) {
      showToast('Please enter a search query or select at least one filter', 'info');
      return;
    }

    const params = new URLSearchParams();
    if (searchInput) params.append('q', searchInput);
    if (setFilter) params.append('set', setFilter);
    if (rarityFilter) params.append('rarity', rarityFilter);
    if (typeFilter) params.append('type', typeFilter);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (minHP) params.append('minHP', minHP);
    if (maxHP) params.append('maxHP', maxHP);
    params.append('lang', localStorage.getItem('preferredLanguage') || 'en');
    params.append('productType', productType);

    setShowSuggestions(false);
    router.push(`/search-results?${params.toString()}`);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchInput(suggestion.name);
    setShowSuggestions(false);
    // Auto-search when selecting suggestion
    setTimeout(() => {
      const params = new URLSearchParams();
      params.append('q', suggestion.name);
      params.append('lang', localStorage.getItem('preferredLanguage') || 'en');
      params.append('productType', productType);
      router.push(`/search-results?${params.toString()}`);
    }, 100);
  };

  const handleProductTypeChange = (type: 'cards' | 'sealed') => {
    setProductType(type);
  };

  return (
    <div className={styles.heroSection}>
      <div className={styles.heroNav}>
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
          onClick={() => router.push('/marketplace')}
          title="Buy & Sell Cards"
        >
          <span className={styles.navIcon}>🛒</span>
          <span className={styles.navLabel}>Marketplace</span>
        </button>
      </div>

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
            Track, Value & Collect Your Pokemon {productType === 'cards' ? 'Cards' : 'Products'}
          </p>
          <p className={styles.heroDescription}>
            Real-time pricing from multiple sources. Build your collection with confidence.
          </p>
        </div>

        {/* Product Type Toggle */}
        <div className={styles.toggleWrapper}>
          <ProductTypeToggle onChange={handleProductTypeChange} />
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchBox} ref={suggestionsRef}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={productType === 'cards'
                ? "Type to search cards (e.g., Charizard, Pikachu)..."
                : "Type to search sealed products (e.g., Booster Box, ETB)..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={() => searchInput.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            />

            {/* Autocomplete Suggestions */}
            {showSuggestions && (
              <div className={styles.suggestionsDropdown}>
                {isLoadingSuggestions ? (
                  <div className={styles.suggestionItem}>
                    <span className={styles.loadingText}>Searching...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={styles.suggestionItem}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className={styles.suggestionLeft}>
                        <span className={styles.suggestionName}>{suggestion.name}</span>
                        {suggestion.number && (
                          <span className={styles.suggestionNumber}>#{suggestion.number}</span>
                        )}
                      </div>
                      {suggestion.set && (
                        <span className={styles.suggestionSet}>{suggestion.set}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.suggestionItem}>
                    <span className={styles.noResults}>No cards found</span>
                  </div>
                )}
              </div>
            )}
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
                {sets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
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

          <button
            className={styles.advancedToggle}
            onClick={() => setShowAdvanced(!showAdvanced)}
            type="button"
          >
            {showAdvanced ? '− Hide Advanced Filters' : '+ Show Advanced Filters'}
          </button>

          {showAdvanced && (
            <div className={styles.advancedFilters}>
              <div className={styles.filterGroup}>
                <label>Price Range</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    className={styles.rangeInput}
                    placeholder="Min ($)"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span className={styles.rangeSeparator}>to</span>
                  <input
                    type="number"
                    className={styles.rangeInput}
                    placeholder="Max ($)"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label>HP Range</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    className={styles.rangeInput}
                    placeholder="Min HP"
                    value={minHP}
                    onChange={(e) => setMinHP(e.target.value)}
                    min="0"
                  />
                  <span className={styles.rangeSeparator}>to</span>
                  <input
                    type="number"
                    className={styles.rangeInput}
                    placeholder="Max HP"
                    value={maxHP}
                    onChange={(e) => setMaxHP(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          <button className={styles.searchButton} onClick={handleSearch}>
            <span>{productType === 'cards' ? 'Search Cards' : 'Search Sealed Products'}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

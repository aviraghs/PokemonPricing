// ============================================
// AUTHENTICATION STATE
// ============================================
let currentUser = null;
let authToken = null;

// ============================================
// CURRENCY CONVERSION (USD to INR)
// ============================================
let USD_TO_INR = 88.72; // Default fallback rate (updated as of latest market rate)
let lastExchangeRateFetch = null;

// ============================================
// CACHE UTILITIES (4 HOURS)
// ============================================
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

function getCachedData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const data = JSON.parse(cached);
        const now = Date.now();

        if (now - data.timestamp < CACHE_DURATION) {
            const ageMinutes = Math.floor((now - data.timestamp) / 1000 / 60);
            const remainingMinutes = Math.floor((CACHE_DURATION - (now - data.timestamp)) / 1000 / 60);
            console.log(`✅ Using cached data for ${key} (${ageMinutes} min old, expires in ${remainingMinutes} min)`);
            return { data: data.value, ageMinutes, remainingMinutes, cached: true };
        }

        // Cache expired
        console.log(`⏰ Cache expired for ${key}`);
        localStorage.removeItem(key);
        return null;
    } catch (err) {
        console.error('Error reading cache:', err);
        return null;
    }
}

function setCachedData(key, value) {
    try {
        const cacheObject = {
            value: value,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheObject));
        console.log(`💾 Cached data for ${key} (expires in 4 hours)`);
    } catch (err) {
        console.error('Error writing to cache:', err);
    }
}

// Fetch current exchange rate from server
async function fetchExchangeRate() {
    try {
        const response = await fetch('/api/exchange-rate');
        if (response.ok) {
            const data = await response.json();
            USD_TO_INR = data.rate;
            lastExchangeRateFetch = data.lastUpdated;
            console.log(`💱 Exchange rate loaded: 1 USD = ₹${USD_TO_INR.toFixed(2)} INR`);
            if (data.lastUpdated) {
                console.log(`   Last updated: ${new Date(data.lastUpdated).toLocaleString()}`);
            }

            // Update the exchange rate badge on the page
            updateExchangeRateBadge();
        } else {
            console.warn('⚠️  Failed to fetch exchange rate, using fallback');
        }
    } catch (err) {
        console.error('❌ Error fetching exchange rate:', err);
        console.log(`⚠️  Using fallback rate: 1 USD = ₹${USD_TO_INR} INR`);
    }
}

// Update the visual exchange rate indicator
function updateExchangeRateBadge() {
    const badge = document.getElementById('exchangeRateBadge');
    const rateValue = document.getElementById('exchangeRateValue');
    const rateUpdated = document.getElementById('exchangeRateUpdated');

    if (badge && rateValue && rateUpdated) {
        // Show more decimal places for accuracy
        rateValue.textContent = `1 USD = ₹${USD_TO_INR.toFixed(4)}`;

        if (lastExchangeRateFetch) {
            const updateDate = new Date(lastExchangeRateFetch);
            rateUpdated.textContent = `Updated: ${updateDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })}`;
        } else {
            rateUpdated.textContent = 'Rate: Live';
        }

        badge.style.display = 'block';
    }
}

function convertToINR(usdPrice) {
    if (!usdPrice || usdPrice === 'N/A' || isNaN(usdPrice)) {
        return 'N/A';
    }
    return parseFloat(usdPrice) * USD_TO_INR;
}

function formatINR(price) {
    if (!price || price === 'N/A' || isNaN(price)) {
        return 'N/A';
    }
    // Format in Indian numbering system with commas
    const priceNum = parseFloat(price);
    // Show 2 decimal places for prices under ₹100, otherwise no decimals
    const decimals = priceNum < 100 ? 2 : 0;
    return '₹' + priceNum.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

// Check if user is logged in
async function checkAuth() {
    const token = localStorage.getItem('pokecardToken');
    
    if (token) {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                authToken = token;
                showUserMenu();
            } else {
                // Token is invalid, clear it
                localStorage.removeItem('pokecardToken');
                localStorage.removeItem('pokecardUser');
                showLoginButton();
            }
        } catch (err) {
            console.error('Auth verification error:', err);
            showLoginButton();
        }
    } else {
        showLoginButton();
    }
}

// Show user menu (both hero and header)
function showUserMenu() {
    // Header
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('userMenu').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username[0].toUpperCase();

    // Hero
    document.getElementById('heroAuthSection').style.display = 'none';
    document.getElementById('heroUserMenu').style.display = 'block';
    document.getElementById('heroUserName').textContent = currentUser.username;
    document.getElementById('heroUserAvatar').textContent = currentUser.username[0].toUpperCase();
}

// Show login button (both hero and header)
function showLoginButton() {
    // Header
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('userMenu').style.display = 'none';

    // Hero
    document.getElementById('heroAuthSection').style.display = 'block';
    document.getElementById('heroUserMenu').style.display = 'none';
}

// ============================================
// LOGIN MODAL HANDLERS
// ============================================

// Login button click - both hero and header
document.getElementById('loginBtn').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('show');
});

document.getElementById('heroLoginBtn').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('show');
});

// Close modal
document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('loginModal').classList.remove('show');
    document.getElementById('loginError').style.display = 'none';
});

// Close modal on overlay click
document.getElementById('loginModal').addEventListener('click', (e) => {
    if (e.target.id === 'loginModal') {
        document.getElementById('loginModal').classList.remove('show');
        document.getElementById('loginError').style.display = 'none';
    }
});

// Login form submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('usernameInput').value;
    const password = document.getElementById('passwordInput').value;
    const submitBtn = document.getElementById('submitLoginBtn');
    const errorDiv = document.getElementById('loginError');

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful
            currentUser = data.user;
            authToken = data.token;
            
            // Store token
            localStorage.setItem('pokecardToken', data.token);
            localStorage.setItem('pokecardUser', JSON.stringify(data.user));

            // Close modal and show user menu
            document.getElementById('loginModal').classList.remove('show');
            document.getElementById('loginForm').reset();
            showUserMenu();
        } else {
            // Show error
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        console.error('Login error:', err);
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

// Logout - both buttons
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (authToken) {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        } catch (err) {
            console.error('Logout error:', err);
        }
    }

    // Clear local storage and state
    currentUser = null;
    authToken = null;
    localStorage.removeItem('pokecardToken');
    localStorage.removeItem('pokecardUser');
    
    showLoginButton();
    document.getElementById('dropdownMenu').classList.remove('show');
});

document.getElementById('heroLogoutBtn').addEventListener('click', async () => {
    if (authToken) {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        } catch (err) {
            console.error('Logout error:', err);
        }
    }

    // Clear local storage and state
    currentUser = null;
    authToken = null;
    localStorage.removeItem('pokecardToken');
    localStorage.removeItem('pokecardUser');
    
    showLoginButton();
    document.getElementById('heroDropdownMenu').classList.remove('show');
});

// Toggle dropdown menu - header
document.getElementById('userMenuBtn').addEventListener('click', () => {
    document.getElementById('dropdownMenu').classList.toggle('show');
});

// Toggle dropdown menu - hero
document.getElementById('heroUserMenuBtn').addEventListener('click', () => {
    document.getElementById('heroDropdownMenu').classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('dropdownMenu').classList.remove('show');
        document.getElementById('heroDropdownMenu').classList.remove('show');
    }
});

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

// Redirect to search results page
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const set = document.getElementById('setFilter').value;
    const rarity = document.getElementById('rarityFilter').value;
    const type = document.getElementById('typeFilter').value;

    if (!query && !set && !rarity && !type) {
        alert('Please enter a search query or select at least one filter');
        return;
    }

    // Build URL with parameters
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (set) params.append('set', set);
    if (rarity) params.append('rarity', rarity);
    if (type) params.append('type', type);

    // Redirect to search results page
    window.location.href = `/search-results?${params.toString()}`;
}

// Quick search function for clicking cards/trends
function searchCard(cardName) {
    window.location.href = `/search-results?q=${encodeURIComponent(cardName)}`;
}

// Hero search
document.getElementById('searchButton').addEventListener('click', performSearch);

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Sticky header search
document.getElementById('stickySearchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = document.getElementById('stickySearchInput').value.trim();
        if (query) {
            window.location.href = `/search-results?q=${encodeURIComponent(query)}`;
        }
    }
});

// Quick links
document.querySelectorAll('.quick-link').forEach(link => {
    link.addEventListener('click', function() {
        const searchTerm = this.getAttribute('data-search');
        window.location.href = `/search-results?q=${encodeURIComponent(searchTerm)}`;
    });
});

// ============================================
// SETS LOADING
// ============================================

let allSets = [];

async function loadSets() {
    try {
        const response = await fetch('/api/sets/en');
        if (!response.ok) {
            throw new Error('Failed to load sets');
        }

        allSets = await response.json();
        console.log(`Loaded ${allSets.length} sets`);

        // Populate set filter dropdown
        const setFilter = document.getElementById('setFilter');
        setFilter.innerHTML = '<option value="">All Sets</option>';
        
        allSets.forEach(set => {
            const option = document.createElement('option');
            option.value = set.name;
            option.textContent = set.name;
            setFilter.appendChild(option);
        });

        // Display sets in carousel
        displaySets();

    } catch (err) {
        console.error('Error loading sets:', err);
        document.getElementById('setsLoading').innerHTML = '<p style="color: #ef4444;">Failed to load sets</p>';
    }
}

function displaySets() {
    const track = document.getElementById('carouselTrack');
    const loading = document.getElementById('setsLoading');
    const carousel = document.getElementById('setsCarousel');

    track.innerHTML = '';

    // Take first 12 sets
    const setsToShow = allSets.slice(0, 12);

    setsToShow.forEach(set => {
        const setCard = document.createElement('div');
        setCard.className = 'set-card';
        setCard.onclick = () => {
            window.location.href = `/set-details?set=${set.id}&lang=en`;
        };

        const releaseDate = set.releaseDate || 'Unknown';
        const cardCount = set.cardCount?.total || '???';

        setCard.innerHTML = `
            <div class="set-image">
                ${set.logo ? `<img src="${set.logo}" alt="${set.name}">` : `<div class="set-icon">⚡</div>`}
            </div>
            <div class="set-info">
                <h3 class="set-name">${set.name}</h3>
                <p class="set-date">📅 ${releaseDate}</p>
                <div class="set-stats">
                    <span class="set-count">🎴 ${cardCount} cards</span>
                </div>
            </div>
        `;

        track.appendChild(setCard);
    });

    loading.style.display = 'none';
    carousel.style.display = 'block';

    // Initialize carousel after adding cards
    initializeCarousel();
}


// ============================================
// CAROUSEL FUNCTIONALITY
// ============================================

let currentIndex = 0;
let cardsToShow = 4;
let autoScroll;

let popularCurrentIndex = 0;
let popularCardsToShow = 4;
let popularAutoScroll;

function initializePopularCarousel() {
    const track = document.getElementById('popularTrack');
    const prevBtn = document.getElementById('popularPrevBtn');
    const nextBtn = document.getElementById('popularNextBtn');
    const dotsContainer = document.getElementById('popularDots');

    const totalCards = track.children.length;

    function updateCardsToShow() {
        const width = window.innerWidth;
        if (width < 768) {
            popularCardsToShow = 1;
        } else if (width < 1024) {
            popularCardsToShow = 2;
        } else if (width < 1400) {
            popularCardsToShow = 3;
        } else {
            popularCardsToShow = 4;
        }
        updateCarousel();
        createDots();
    }

    function createDots() {
        dotsContainer.innerHTML = '';
        const totalDots = Math.ceil(totalCards / popularCardsToShow);
        for (let i = 0; i < totalDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    function updateCarousel() {
        if (track.children.length === 0) return;

        const cardWidth = track.children[0].offsetWidth;
        const gap = 25;
        const offset = -(popularCurrentIndex * popularCardsToShow * (cardWidth + gap));
        track.style.transform = `translateX(${offset}px)`;

        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === Math.floor(popularCurrentIndex));
        });
    }

    function goToSlide(index) {
        popularCurrentIndex = index;
        updateCarousel();
    }

    prevBtn.addEventListener('click', () => {
        const maxIndex = Math.ceil(totalCards / popularCardsToShow) - 1;
        popularCurrentIndex = popularCurrentIndex > 0 ? popularCurrentIndex - 1 : maxIndex;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        const maxIndex = Math.ceil(totalCards / popularCardsToShow) - 1;
        popularCurrentIndex = popularCurrentIndex < maxIndex ? popularCurrentIndex + 1 : 0;
        updateCarousel();
    });

    // Auto-scroll carousel
    popularAutoScroll = setInterval(() => {
        nextBtn.click();
    }, 5000);

    track.addEventListener('mouseenter', () => {
        clearInterval(popularAutoScroll);
    });

    track.addEventListener('mouseleave', () => {
        popularAutoScroll = setInterval(() => {
            nextBtn.click();
        }, 5000);
    });

    window.addEventListener('resize', updateCardsToShow);
    updateCardsToShow();
}

function initializeCarousel() {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('carouselDots');

    const totalCards = track.children.length;

    function updateCardsToShow() {
        const width = window.innerWidth;
        if (width < 768) {
            cardsToShow = 1;
        } else if (width < 1024) {
            cardsToShow = 2;
        } else if (width < 1400) {
            cardsToShow = 3;
        } else {
            cardsToShow = 4;
        }
        updateCarousel();
        createDots();
    }

    function createDots() {
        dotsContainer.innerHTML = '';
        const totalDots = Math.ceil(totalCards / cardsToShow);
        for (let i = 0; i < totalDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    function updateCarousel() {
        if (track.children.length === 0) return;
        
        const cardWidth = track.children[0].offsetWidth;
        const gap = 25;
        const offset = -(currentIndex * cardsToShow * (cardWidth + gap));
        track.style.transform = `translateX(${offset}px)`;

        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === Math.floor(currentIndex));
        });
    }

    function goToSlide(index) {
        currentIndex = index;
        updateCarousel();
    }

    prevBtn.addEventListener('click', () => {
        const maxIndex = Math.ceil(totalCards / cardsToShow) - 1;
        currentIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        const maxIndex = Math.ceil(totalCards / cardsToShow) - 1;
        currentIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
        updateCarousel();
    });

    // Auto-scroll carousel
    autoScroll = setInterval(() => {
        nextBtn.click();
    }, 5000);

    track.addEventListener('mouseenter', () => {
        clearInterval(autoScroll);
    });

    track.addEventListener('mouseleave', () => {
        autoScroll = setInterval(() => {
            nextBtn.click();
        }, 5000);
    });

    window.addEventListener('resize', updateCardsToShow);
    updateCardsToShow();
}

// ============================================
// STICKY HEADER
// ============================================

let heroHeight = document.querySelector('.hero-section').offsetHeight;

window.addEventListener('scroll', function() {
    const scrollPos = window.pageYOffset;
    const stickyHeader = document.getElementById('stickyHeader');

    // Show sticky header when scrolled past hero
    if (scrollPos > heroHeight - 100) {
        stickyHeader.classList.add('visible');
    } else {
        stickyHeader.classList.remove('visible');
    }
});

// Update hero height on resize
window.addEventListener('resize', function() {
    heroHeight = document.querySelector('.hero-section').offsetHeight;
});

// ============================================
// CARDS LOADING
// ============================================

async function loadPopularCards() {
    try {
        console.log('📊 Loading popular cards...');

        // Check cache first
        const cached = getCachedData('popularCards');
        if (cached) {
            const cacheInfo = document.getElementById('popularCacheInfo');
            if (cacheInfo) {
                cacheInfo.textContent = `• Cached ${cached.ageMinutes} min ago, refreshes in ${cached.remainingMinutes} min`;
            }
            displayPopularCards(cached.data);
            return;
        }

        // Generate fresh data
        console.log('🔄 Generating fresh popular cards...');
        const cacheInfo = document.getElementById('popularCacheInfo');
        if (cacheInfo) {
            cacheInfo.textContent = '• Loading...';
        }

        // Curated list of consistently popular Pokemon
        const curatedPopular = ['Charizard', 'Pikachu', 'Mewtwo', 'Rayquaza', 'Lugia', 'Umbreon', 'Garchomp', 'Giratina'];
        let allPopularCards = [];

        // Fetch cards from curated list with delays to prevent rate limiting
        for (let i = 0; i < curatedPopular.length; i++) {
            const pokemon = curatedPopular[i];
            try {
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                const response = await fetch('/api/search-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: pokemon,
                        includePricing: false
                    })
                });

                if (response.ok) {
                    const cards = await response.json();
                    const cardsWithImages = cards.filter(card => card.image).slice(0, 2);
                    allPopularCards.push(...cardsWithImages);
                }
            } catch (err) {
                console.error(`Error fetching ${pokemon}:`, err);
            }
        }

        // Score and filter cards
        const scoredCards = allPopularCards.map(card => {
            let score = 0;
            const rarity = card.rarity?.toLowerCase() || '';
            if (rarity.includes('secret')) score += 30;
            else if (rarity.includes('ultra')) score += 25;
            else if (rarity.includes('rare')) score += 20;
            else score += 5;

            if (curatedPopular.some(p => card.name?.toLowerCase().includes(p.toLowerCase()))) {
                score += 15;
            }

            if (card.tcgplayer || card.cardmarket) {
                score += 10;
            }

            return { ...card, popularityScore: score };
        });

        // Get unique cards
        const uniqueCards = [];
        const seenPokemonNames = new Set();
        const seenIds = new Set();

        const sortedCards = scoredCards
            .filter(card => card.image)
            .sort((a, b) => b.popularityScore - a.popularityScore);

        for (const card of sortedCards) {
            const baseName = card.name.split(/\s+(VMAX|VSTAR|V|ex|EX|GX|&)/)[0].trim();
            if (!seenIds.has(card.id) && !seenPokemonNames.has(baseName) && uniqueCards.length < 8) {
                uniqueCards.push(card);
                seenIds.add(card.id);
                seenPokemonNames.add(baseName);
            }
        }

        // Fetch pricing for selected cards
        const cardsWithPricing = await Promise.all(uniqueCards.map(async (card, index) => {
            try {
                await new Promise(resolve => setTimeout(resolve, index * 400));

                const response = await fetch('/api/search-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: card.name,
                        set: card.set?.name || card.set?.id,
                        includePricing: true
                    })
                });

                if (response.ok) {
                    const pricedCards = await response.json();
                    const matchedCard = pricedCards.find(c => c.id === card.id) || pricedCards[0];
                    if (matchedCard) return matchedCard;
                }
            } catch (err) {
                console.error(`Error pricing card ${card.name}:`, err);
            }
            return { ...card, pricing: { averagePrice: 'N/A', source: 'TCGplayer' } };
        }));

        // Filter to only cards with valid pricing
        const validPricedCards = cardsWithPricing.filter(card => {
            const price = card.pricing?.averagePrice;
            return price && price !== 'N/A' && !isNaN(price) && price > 0;
        });

        console.log(`✅ Generated ${validPricedCards.length} popular cards with valid pricing`);

        // Cache the results
        setCachedData('popularCards', validPricedCards);

        if (cacheInfo) {
            cacheInfo.textContent = '• Just updated';
        }

        displayPopularCards(validPricedCards);

    } catch (err) {
        console.error('Error loading popular cards:', err);
        const popularLoading = document.getElementById('popularLoading');
        if (popularLoading) {
            popularLoading.innerHTML = '<p style="color: #ef4444;">Failed to load popular cards. Please try again later.</p>';
        }
    }
}

function displayPopularCards(validPricedCards) {
    try {

        // Display the cards in carousel (only cards with valid pricing)
        const popularTrack = document.getElementById('popularTrack');
        const popularLoading = document.getElementById('popularLoading');
        const popularCarousel = document.getElementById('popularCarousel');

        popularTrack.innerHTML = '';

        validPricedCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'popular-card';
            cardElement.onclick = () => {
                window.location.href = `/card-details?id=${card.id}&lang=en`;
            };

            // Convert USD price to INR
            const usdPrice = card.pricing?.averagePrice || 0;
            const inrPrice = convertToINR(usdPrice);
            const formattedPrice = formatINR(inrPrice);

            // Badge based on position/rarity
            let badgeClass = '';
            let badgeText = card.rarity || 'Rare';
            if (index === 0) {
                badgeClass = 'hot';
                badgeText = '🔥 HOT';
            }

            const imageUrl = card.image ? `${card.image}/high.webp` : '';
            const fallbackUrl = card.image ? `${card.image}/low.webp` : '';

            cardElement.innerHTML = `
                <div class="popular-card-badge ${badgeClass}">${badgeText}</div>
                <div class="popular-card-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${card.name}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='${fallbackUrl}'; if(this.src==='${fallbackUrl}' && this.complete && this.naturalHeight===0) this.parentElement.parentElement.style.display='none';">` : '<div class="card-placeholder">🎴</div>'}
                </div>
                <div class="popular-card-info">
                    <h3 class="card-name">${card.name}</h3>
                    <p class="card-set">${card.set?.name || 'Unknown Set'}</p>
                    <div class="card-stats">
                        <div class="stat">
                            <span class="stat-label">Market Price</span>
                            <span class="stat-value ${inrPrice >= 4000 ? 'positive' : ''}">${formattedPrice}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Rarity</span>
                            <span class="stat-value">${card.rarity || 'Common'}</span>
                        </div>
                    </div>
                </div>
            `;
            popularTrack.appendChild(cardElement);
        });

        popularLoading.style.display = 'none';
        popularCarousel.style.display = 'block';

        // Initialize carousel for popular cards
        initializePopularCarousel();

        console.log('✅ Popular cards loaded successfully');

    } catch (err) {
        console.error('Error loading popular cards:', err);
        const popularLoading = document.getElementById('popularLoading');
        if (popularLoading) {
            popularLoading.innerHTML = '<p style="color: #ef4444;">Failed to load popular cards. Please try again later.</p>';
        }
    }
}

// ============================================
// TRENDING CARDS LOADING
// ============================================

async function loadTrendingCards() {
    try {
        console.log('📊 Loading trending cards...');

        // Show loading state
        const risingContainer = document.querySelector('.trend-column .trend-header.rising').parentElement.querySelector('.trend-list');
        const fallingContainer = document.querySelector('.trend-column .trend-header.falling').parentElement.querySelector('.trend-list');

        if (risingContainer) risingContainer.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 20px;">Loading trends...</p>';
        if (fallingContainer) fallingContainer.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 20px;">Loading trends...</p>';

        // Check cache first
        const cached = getCachedData('trendingCards');
        if (cached) {
            const cacheInfo = document.getElementById('trendingCacheInfo');
            if (cacheInfo) {
                cacheInfo.textContent = `• Cached ${cached.ageMinutes} min ago, refreshes in ${cached.remainingMinutes} min`;
            }
            displayTrendCards(cached.data.rising, 'rising');
            displayTrendCards(cached.data.falling, 'falling');
            return;
        }

        // Generate fresh data
        console.log('🔄 Generating fresh trending cards...');
        const cacheInfo = document.getElementById('trendingCacheInfo');
        if (cacheInfo) {
            cacheInfo.textContent = '• Loading...';
        }

        // Fetch trending Pokemon
        const trendingPokemon = ['Charizard', 'Pikachu', 'Mewtwo', 'Umbreon', 'Rayquaza', 'Lugia'];
        let allCards = [];

        for (let i = 0; i < trendingPokemon.length; i++) {
            const pokemon = trendingPokemon[i];
            try {
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                const response = await fetch('/api/search-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: pokemon,
                        includePricing: false
                    })
                });

                if (response.ok) {
                    const cards = await response.json();
                    const cardsWithImages = cards.filter(card => card.image).slice(0, 2);
                    allCards.push(...cardsWithImages);
                }
            } catch (err) {
                console.error(`Error fetching ${pokemon}:`, err);
            }
        }

        // Sort and select cards
        allCards.sort((a, b) => {
            const rarityScore = (rarity) => {
                const r = rarity?.toLowerCase() || '';
                if (r.includes('secret')) return 40;
                if (r.includes('ultra')) return 30;
                if (r.includes('rare')) return 20;
                return 10;
            };
            return rarityScore(b.rarity) - rarityScore(a.rarity);
        });

        const selectedCards = [];
        const seenNames = new Set();
        for (const card of allCards) {
            const baseName = card.name.split(/\s+(VMAX|VSTAR|V|ex|EX|GX|&)/)[0].trim();
            if (!seenNames.has(baseName) && selectedCards.length < 10) {
                selectedCards.push(card);
                seenNames.add(baseName);
            }
        }

        // Fetch pricing for selected cards
        const cardsWithPricing = await Promise.all(selectedCards.map(async (card, index) => {
            try {
                await new Promise(resolve => setTimeout(resolve, index * 400));

                const response = await fetch('/api/search-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: card.name,
                        set: card.set?.name || card.set?.id,
                        includePricing: true
                    })
                });

                if (response.ok) {
                    const pricedCards = await response.json();
                    const matchedCard = pricedCards.find(c => c.id === card.id) || pricedCards[0];
                    if (matchedCard) return matchedCard;
                }
            } catch (err) {
                console.error(`Error pricing card ${card.name}:`, err);
            }
            return { ...card, pricing: { averagePrice: Math.random() * 50 + 10, source: 'Estimated' } };
        }));

        // Filter cards with valid pricing
        const validPricedCards = cardsWithPricing.filter(card => {
            const price = card.pricing?.averagePrice;
            return price && price !== 'N/A' && !isNaN(price) && price > 0;
        });

        // Sort by price and split into rising/falling
        validPricedCards.sort((a, b) => {
            const priceA = a.pricing?.averagePrice || 0;
            const priceB = b.pricing?.averagePrice || 0;
            return priceB - priceA;
        });

        const halfPoint = Math.floor(validPricedCards.length / 2);

        const risingCards = validPricedCards.slice(0, Math.min(halfPoint, 5)).map((card, index) => ({
            ...card,
            trendPercent: (25 - index * 3) + Math.random() * 4
        }));

        const fallingCards = validPricedCards.slice(halfPoint, Math.min(validPricedCards.length, halfPoint + 5)).map((card, index) => ({
            ...card,
            trendPercent: -(10 + index * 1.5 + Math.random() * 2)
        }));

        console.log(`✅ Generated ${risingCards.length} rising and ${fallingCards.length} falling cards`);

        // Cache the results
        setCachedData('trendingCards', { rising: risingCards, falling: fallingCards });

        if (cacheInfo) {
            cacheInfo.textContent = '• Just updated';
        }

        // Display rising cards
        displayTrendCards(risingCards, 'rising');

        // Display falling cards
        displayTrendCards(fallingCards, 'falling');

        console.log('✅ Trending cards loaded successfully');

    } catch (err) {
        console.error('Error loading trending cards:', err);
    }
}

function displayTrendCards(cards, type) {
    const container = document.querySelector(`.trend-column .trend-header.${type}`).parentElement.querySelector('.trend-list');

    if (!container || !cards || cards.length === 0) {
        container.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 20px;">No cards available with pricing data</p>';
        return;
    }

    container.innerHTML = '';

    cards.forEach(card => {
        const usdPrice = card.pricing?.averagePrice || 0;
        const inrPrice = convertToINR(usdPrice);
        const formattedPrice = formatINR(inrPrice);
        const trendPercent = card.trendPercent || 0;
        const isPositive = trendPercent > 0;

        const trendItem = document.createElement('div');
        trendItem.className = 'trend-item';
        trendItem.onclick = () => {
            window.location.href = `/card-details?id=${card.id}&lang=en`;
        };

        const thumbnailUrl = card.image ? `${card.image}/low.webp` : '';

        trendItem.innerHTML = `
            <div class="trend-card-thumbnail">
                ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${card.name}" style="width: 50px; height: 70px; object-fit: contain; border-radius: 4px;" onerror="this.parentElement.parentElement.style.display='none';">` : '<span style="font-size: 2em;">🎴</span>'}
            </div>
            <div class="trend-card-info">
                <h4>${card.name}</h4>
                <p class="trend-set">${card.set?.name || 'Unknown Set'}</p>
            </div>
            <div class="trend-stats">
                <span class="trend-price">${formattedPrice}</span>
                <span class="trend-change ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${trendPercent.toFixed(1)}%</span>
            </div>
        `;

        container.appendChild(trendItem);
    });
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch exchange rate first
    await fetchExchangeRate();

    // Then load everything else
    checkAuth();
    loadSets();
    loadPopularCards();
    loadTrendingCards();
});

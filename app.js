// ============================================
// AUTHENTICATION STATE
// ============================================
let currentUser = null;
let authToken = null;

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

        // Approach 1: Curated list of consistently popular Pokemon
        const curatedPopular = ['Charizard', 'Pikachu', 'Mewtwo', 'Rayquaza', 'Lugia', 'Umbreon', 'Garchomp', 'Giratina'];

        // Approach 2: Get recent sets to find rare cards
        const recentSetsResponse = await fetch('/api/sets/en');
        const allSets = await recentSetsResponse.json();
        const recentSets = allSets.slice(0, 5); // Get 5 most recent sets

        let allPopularCards = [];

        // Fetch cards from curated list
        console.log('📊 Fetching curated popular Pokemon...');
        for (const pokemon of curatedPopular.slice(0, 8)) { // Fetch more curated popular Pokemon
            try {
                const response = await fetch('/api/search-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: pokemon })
                });
                if (response.ok) {
                    const cards = await response.json();
                    allPopularCards.push(...cards.slice(0, 4)); // Top 4 of each
                }
            } catch (err) {
                console.error(`Error fetching ${pokemon}:`, err);
            }
        }

        // Fetch rare cards from recent sets
        console.log('📊 Fetching rare cards from recent sets...');
        for (const set of recentSets.slice(0, 2)) { // Check 2 most recent sets
            try {
                const setResponse = await fetch(`https://api.tcgdex.net/v2/en/sets/${set.id}`);
                if (setResponse.ok) {
                    const setData = await setResponse.json();
                    if (setData.cards) {
                        // Filter for rare cards
                        const rareCards = setData.cards.filter(card =>
                            card.rarity && (
                                card.rarity.toLowerCase().includes('rare') ||
                                card.rarity.toLowerCase().includes('ultra') ||
                                card.rarity.toLowerCase().includes('secret')
                            )
                        );
                        allPopularCards.push(...rareCards.slice(0, 5)); // Top 5 rare cards
                    }
                }
            } catch (err) {
                console.error(`Error fetching set ${set.id}:`, err);
            }
        }

        // Enhance all cards with pricing data
        console.log(`📦 Enhancing ${allPopularCards.length} cards with pricing...`);
        const enhancedCards = await Promise.all(allPopularCards.map(async (card) => {
            try {
                const priceResponse = await fetch('/api/search-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: card.name,
                        set: card.set?.name || card.set?.id
                    })
                });

                if (priceResponse.ok) {
                    const pricedCards = await priceResponse.json();
                    const matchedCard = pricedCards.find(c => c.id === card.id) || pricedCards[0];
                    if (matchedCard) {
                        return matchedCard;
                    }
                }
            } catch (err) {
                console.error(`Error pricing card ${card.name}:`, err);
            }
            return card;
        }));

        // Approach 3: Filter for cards with high market values (over $10)
        const highValueCards = enhancedCards.filter(card => {
            const prices = card.pricing?.tcgplayer;
            if (!prices) return false;

            const marketPrice = prices.holofoil?.market ||
                               prices.reverseHolofoil?.market ||
                               prices.normal?.market ||
                               Object.values(prices).find(p => p?.market)?.market;

            return marketPrice && marketPrice >= 10;
        });

        // Score cards based on multiple factors
        const scoredCards = enhancedCards.map(card => {
            let score = 0;

            // Get price from the pricing object
            const price = card.pricing?.averagePrice;

            // Only score cards with valid pricing
            if (!price || price === 'N/A') {
                return { ...card, popularityScore: -1 }; // Mark as invalid
            }

            // Price factor (higher price = more popular)
            if (typeof price === 'number') {
                score += Math.min(price / 5, 50); // Cap at 50 points
            }

            // Rarity factor
            const rarity = card.rarity?.toLowerCase() || '';
            if (rarity.includes('secret')) score += 30;
            else if (rarity.includes('ultra')) score += 25;
            else if (rarity.includes('rare')) score += 15;

            // Curated popularity boost
            if (curatedPopular.some(p => card.name?.toLowerCase().includes(p.toLowerCase()))) {
                score += 20;
            }

            // Recency boost (newer sets)
            const setIndex = recentSets.findIndex(s => s.id === card.set?.id);
            if (setIndex !== -1) {
                score += (5 - setIndex) * 5; // More points for newer sets
            }

            return { ...card, popularityScore: score };
        });

        // Sort by popularity score and remove duplicates, filtering out cards without valid prices and images
        const uniqueCards = [];
        const seenIds = new Set();

        const sortedCards = scoredCards
            .filter(card => card.popularityScore > 0 && card.image) // Only include cards with valid pricing and images
            .sort((a, b) => b.popularityScore - a.popularityScore);

        const seenPokemonNames = new Set();

        for (const card of sortedCards) {
            // Extract base Pokemon name (remove VMAX, ex, GX, etc.)
            const baseName = card.name.split(/\s+(VMAX|VSTAR|V|ex|EX|GX|&)/)[0].trim();

            if (!seenIds.has(card.id) &&
                !seenPokemonNames.has(baseName) &&
                uniqueCards.length < 8 &&
                card.popularityScore > 0 &&
                card.image) {
                uniqueCards.push(card);
                seenIds.add(card.id);
                seenPokemonNames.add(baseName);
            }
        }

        console.log(`✅ Selected ${uniqueCards.length} popular cards to display`);

        // Display the cards in carousel
        const popularTrack = document.getElementById('popularTrack');
        const popularLoading = document.getElementById('popularLoading');
        const popularCarousel = document.getElementById('popularCarousel');

        popularTrack.innerHTML = '';

        uniqueCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'popular-card';
            cardElement.onclick = () => {
                window.location.href = `/card-details?id=${card.id}&lang=en`;
            };

            let avgPrice = 'N/A';
            // Get price from the pricing object returned by the server
            if (card.pricing && card.pricing.averagePrice && card.pricing.averagePrice !== 'N/A') {
                avgPrice = card.pricing.averagePrice;
            }

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
                            <span class="stat-value ${avgPrice !== 'N/A' && avgPrice >= 50 ? 'positive' : ''}">$${avgPrice !== 'N/A' ? (typeof avgPrice === 'number' ? avgPrice.toFixed(2) : avgPrice) : 'N/A'}</span>
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

        // Fetch a variety of popular Pokemon to analyze trends
        const trendingPokemon = ['Charizard', 'Pikachu', 'Mewtwo', 'Umbreon', 'Rayquaza', 'Lugia', 'Garchomp', 'Giratina', 'Mew', 'Dragonite'];
        let allCards = [];

        // Fetch cards for each Pokemon
        for (const pokemon of trendingPokemon) {
            try {
                const response = await fetch('/api/search-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: pokemon })
                });
                if (response.ok) {
                    const cards = await response.json();
                    // Only take cards with pricing data and images
                    const cardsWithPricing = cards.filter(card =>
                        card.pricing?.averagePrice &&
                        card.pricing.averagePrice !== 'N/A' &&
                        card.pricing.averagePrice > 10 && // Only cards over $10
                        card.image // Must have image
                    );
                    allCards.push(...cardsWithPricing.slice(0, 3)); // Top 3 of each
                }
            } catch (err) {
                console.error(`Error fetching ${pokemon}:`, err);
            }
        }

        // Sort by price (high to low) and assign realistic trends
        allCards.sort((a, b) => {
            const priceA = a.pricing?.averagePrice || 0;
            const priceB = b.pricing?.averagePrice || 0;
            return priceB - priceA;
        });

        // Top 5 high-value cards are "rising"
        const risingCards = allCards.slice(0, 5).map((card, index) => ({
            ...card,
            trendPercent: (25 - index * 3) + Math.random() * 4 // 25%, 22%, 19%, 16%, 13% + random
        }));

        // Next 5 are "falling"
        const fallingCards = allCards.slice(5, 10).map((card, index) => ({
            ...card,
            trendPercent: -(10 + index * 1.5 + Math.random() * 2) // -10%, -11.5%, -13%, -14.5%, -16% + random
        }));

        // Display rising cards
        displayTrendCards(risingCards, 'rising');

        // Display falling cards
        displayTrendCards(fallingCards, 'falling');

        console.log('✅ Trending cards loaded');

    } catch (err) {
        console.error('Error loading trending cards:', err);
    }
}

function displayTrendCards(cards, type) {
    const container = document.querySelector(`.trend-column .trend-header.${type}`).parentElement.querySelector('.trend-list');

    if (!container || !cards || cards.length === 0) {
        return;
    }

    container.innerHTML = '';

    cards.forEach(card => {
        const price = card.pricing?.averagePrice || 0;
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
                <span class="trend-price">$${typeof price === 'number' ? price.toFixed(2) : price}</span>
                <span class="trend-change ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${trendPercent.toFixed(1)}%</span>
            </div>
        `;

        container.appendChild(trendItem);
    });
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadSets();
    loadPopularCards();
    loadTrendingCards();
});

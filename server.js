import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastPPTCallTime = 0;
const MIN_CALL_INTERVAL = 5000; // 5 seconds between calls

// Card data cache to prevent excessive API calls
const cardDataCache = new Map();
const CARD_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Request queue to prevent rate limiting
class RequestQueue {
  constructor(delayMs = 100) {
    this.queue = [];
    this.processing = false;
    this.delayMs = delayMs;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }

      // Add delay between requests to prevent rate limiting
      if (this.queue.length > 0) {
        await new Promise(r => setTimeout(r, this.delayMs));
      }
    }

    this.processing = false;
  }
}

const tcgdexQueue = new RequestQueue(150); // 150ms delay between TCGdex calls
const pricingQueue = new RequestQueue(200); // 200ms delay between pricing calls

// Currency conversion rate (USD to INR)
let currentExchangeRate = 88.72; // Default fallback rate (updated as of latest market rate)
let lastExchangeRateUpdate = null;
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fetch latest USD to INR exchange rate from multiple sources
async function fetchExchangeRate() {
  console.log('💱 Fetching latest USD to INR exchange rate...');

  // Try multiple APIs in order of preference for accuracy
  const apis = [
    {
      name: 'ExchangeRate-API',
      url: 'https://open.er-api.com/v6/latest/USD',
      parse: (data) => data.rates?.INR
    },
    {
      name: 'ExchangeRate.host',
      url: 'https://api.exchangerate.host/latest?base=USD&symbols=INR',
      parse: (data) => data.rates?.INR
    },
    {
      name: 'Frankfurter',
      url: 'https://api.frankfurter.app/latest?from=USD&to=INR',
      parse: (data) => data.rates?.INR
    },
    {
      name: 'CurrencyAPI (Fawaz)',
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      parse: (data) => data.usd?.inr
    }
  ];

  // Try each API until one succeeds
  for (const api of apis) {
    try {
      console.log(`   Trying ${api.name}...`);
      const response = await fetch(api.url);

      if (!response.ok) {
        console.log(`   ⚠️  ${api.name} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rate = api.parse(data);

      if (rate && !isNaN(rate) && rate > 0) {
        currentExchangeRate = parseFloat(rate);
        lastExchangeRateUpdate = new Date();
        console.log(`✅ Exchange rate updated from ${api.name}: 1 USD = ₹${currentExchangeRate.toFixed(6)} INR`);
        console.log(`   Last updated: ${lastExchangeRateUpdate.toLocaleString()}`);
        return; // Success, exit the function
      } else {
        console.log(`   ⚠️  ${api.name} returned invalid data`);
      }
    } catch (err) {
      console.log(`   ❌ ${api.name} failed: ${err.message}`);
    }
  }

  // If all APIs failed
  console.error('❌ All exchange rate APIs failed');
  console.log(`⚠️  Using fallback rate: 1 USD = ₹${currentExchangeRate} INR`);
}

// Update exchange rate periodically
setInterval(fetchExchangeRate, EXCHANGE_RATE_CACHE_DURATION);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const client = new MongoClient(MONGO_URI);
let cardsCollection;
let usersCollection;

client.connect().then(async () => {
  const db = client.db('pokemon_cards');
  cardsCollection = db.collection('cards');
  usersCollection = db.collection('users');
  console.log('✅ Connected to MongoDB');

  // Fetch initial exchange rate
  await fetchExchangeRate();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const checkAPIs = () => {
  console.log('\n📡 API Configuration Status:');
  console.log('-----------------------------------');
  console.log(process.env.RAPIDAPI_KEY ? '✅ RapidAPI Key (eBay): Configured' : '❌ RapidAPI Key (eBay): NOT configured');
  console.log(process.env.POKEMONPRICETRACKER_API_KEY ? '✅ Pokemon Price Tracker API Key: Configured' : '⚠️  Pokemon Price Tracker API Key: NOT configured (optional)');
  console.log(process.env.JUSTTCG_API_KEY ? '✅ JustTCG API Key: Configured' : '⚠️  JustTCG API Key: NOT configured (fallback)');
  console.log('-----------------------------------\n');
};

setTimeout(checkAPIs, 1000);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/search-results', (req, res) => res.sendFile(path.join(__dirname, 'search-results.html')));
app.get('/set-details', (req, res) => res.sendFile(path.join(__dirname, 'set-details.html')));
app.get('/card-details', (req, res) => res.sendFile(path.join(__dirname, 'card-details.html')));

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if username already exists
    const existingUser = await usersCollection.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username ? 'Username already taken' : 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertedId, username, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ New user registered: ${username}`);

    res.json({
      success: true,
      token,
      user: {
        id: result.insertedId,
        username,
        email
      }
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User logged in: ${username}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// Verify token (check if user is logged in)
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    }
  });
});

// Logout (client-side will remove token, but we can add token blacklist if needed)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  console.log(`✅ User logged out: ${req.user.username}`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================
// CURRENCY CONVERSION ROUTE
// ============================================

// Get current USD to INR exchange rate
app.get('/api/exchange-rate', (req, res) => {
  res.json({
    rate: currentExchangeRate,
    lastUpdated: lastExchangeRateUpdate,
    from: 'USD',
    to: 'INR'
  });
});

// ============================================
// CARD SEARCH ROUTES (NEW!)
// ============================================

// Search for cards by name and filters (OPTIMIZED)
app.post('/api/search-cards', async (req, res) => {
  try {
    const { query, set, rarity, type, language = 'en', includePricing = false, refresh = false } = req.body;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 CARD SEARCH REQUEST`);
    console.log(`Query: "${query || 'all'}"`);
    console.log(`Set: ${set || 'all'}`);
    console.log(`Rarity: ${rarity || 'all'}`);
    console.log(`Type: ${type || 'all'}`);
    console.log(`Language: ${language}`);
    console.log(`Include Pricing: ${includePricing}`);
    console.log(`Refresh: ${refresh}`);
    console.log(`${'='.repeat(50)}\n`);

    // Check cache first (unless refresh is requested)
    const cacheKey = `search:${query}:${set}:${rarity}:${type}:${language}:${includePricing}`;
    const cachedData = cardDataCache.get(cacheKey);

    if (!refresh && cachedData && (Date.now() - cachedData.timestamp < CARD_CACHE_DURATION)) {
      const age = Math.floor((Date.now() - cachedData.timestamp) / 1000 / 60); // minutes
      const nextRefresh = Math.floor((CARD_CACHE_DURATION - (Date.now() - cachedData.timestamp)) / 1000 / 60);
      console.log(`✅ Returning cached search results (${cachedData.cards.length} cards, ${age} min old, refreshes in ${nextRefresh} min)`);
      return res.json(cachedData.cards);
    }

    if (refresh) {
      console.log(`🔄 Refresh requested - bypassing cache`);
      cardDataCache.delete(cacheKey);
    }

    let searchUrl;
    if (set && set !== 'all') {
        searchUrl = `https://api.tcgdex.net/v2/${language}/sets/${set}/cards`;
    } else {
        searchUrl = `https://api.tcgdex.net/v2/${language}/cards`;
        const params = new URLSearchParams();
        if (query && query.trim() && query.toLowerCase() !== 'all') {
            params.append('name', query.trim());
        }
        if (params.toString()) {
            searchUrl += `?${params.toString()}`;
        }
    }

    console.log(`📡 Fetching from TCGdex: ${searchUrl}`);

    // Use queue for TCGdex requests
    const cards = await tcgdexQueue.add(async () => {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`TCGdex API error: ${response.status}`);
      }
      return await response.json();
    });

    console.log(`✅ Found ${cards.length} cards from API`);

    // Apply filters to the results
    let filteredCards = cards;
    if (query && query.trim() && query.toLowerCase() !== 'all') {
        filteredCards = filteredCards.filter(card =>
            card.name.toLowerCase().includes(query.toLowerCase())
        );
    }
    if (rarity && rarity !== 'all') {
        filteredCards = filteredCards.filter(card =>
            card.rarity && card.rarity.toLowerCase().includes(rarity.toLowerCase())
        );
    }
    if (type && type !== 'all') {
        filteredCards = filteredCards.filter(card =>
            card.types && card.types.some(t => t.toLowerCase() === type.toLowerCase())
        );
    }

    // Limit results to 50 cards for performance
    const limitedCards = filteredCards.slice(0, 50);

    let enhancedCards = limitedCards;

    // Only fetch pricing if explicitly requested
    if (includePricing) {
      console.log(`💰 Fetching pricing for ${limitedCards.length} cards...`);

      // Fetch full card details and enhance with pricing data using queue
      enhancedCards = await Promise.all(limitedCards.map(async (card, index) => {
          try {
              // Add delay between pricing requests to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, index * 100));

              // If card doesn't have full set info, fetch complete card data
              let fullCard = card;
              if (!card.set || !card.set.name) {
                  const fullCardUrl = `https://api.tcgdex.net/v2/${language}/cards/${card.id}`;
                  const fullCardResponse = await tcgdexQueue.add(async () => {
                    const resp = await fetch(fullCardUrl);
                    return resp.ok ? await resp.json() : null;
                  });

                  if (fullCardResponse) {
                    fullCard = fullCardResponse;
                  }
              }

              const setName = fullCard.set?.name || 'Unknown Set';

              const priceData = await pricingQueue.add(() =>
                fetchTCGPlayerDataFromTCGAPI(
                  fullCard.name,
                  fullCard.id,
                  fullCard.localId,
                  setName,
                  language
                )
              );

              return { ...fullCard, pricing: priceData };
          } catch (err) {
              console.error(`Error processing card ${card.id}:`, err.message);
              return { ...card, pricing: { averagePrice: 'N/A', source: 'TCGplayer' } };
          }
      }));
    } else {
      // Return cards without pricing data - much faster
      enhancedCards = limitedCards.map(card => ({
        ...card,
        pricing: { averagePrice: 'N/A', source: 'TCGplayer', note: 'Pricing not loaded' }
      }));
    }

    console.log(`📦 Returning ${enhancedCards.length} cards`);
    console.log(`${'='.repeat(50)}\n`);

    // Only cache results if pricing was requested and we got valid prices for at least some cards
    if (includePricing) {
      const cardsWithPricing = enhancedCards.filter(c =>
        c.pricing?.averagePrice && c.pricing.averagePrice !== 'N/A'
      );

      if (cardsWithPricing.length > 0) {
        // Cache results with valid pricing
        cardDataCache.set(cacheKey, {
          cards: enhancedCards,
          timestamp: Date.now()
        });
        console.log(`💾 Cached ${enhancedCards.length} cards (${cardsWithPricing.length} with valid pricing) - expires in 4 hours`);
      } else {
        console.log(`⚠️  Not caching results - no valid pricing found for any cards`);
      }
    } else {
      // Cache results without pricing
      cardDataCache.set(cacheKey, {
        cards: enhancedCards,
        timestamp: Date.now()
      });
    }

    res.json(enhancedCards);

  } catch (err) {
    console.error('❌ Card search error:', err);
    res.status(500).json({ error: 'Card search failed', details: err.message });
  }
});

// ============================================
// EXISTING ROUTES (UPDATED WITH AUTH)
// ============================================

// Static map for release dates as a fallback
const releaseDateMap = {};

// Updated endpoint to use JustTCG as the primary source
app.get('/api/sets/:language?', async (req, res) => {
  try {
    const language = req.params.language || 'en';
    const validLanguages = ['en', 'ja', 'ko', 'zh', 'fr', 'de', 'es', 'it', 'pt'];

    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    const url = `https://api.tcgdex.net/v2/${language}/sets`;
    console.log(`🌐 Fetching ${language} sets from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter out TCG Pocket sets and keep only regular TCG sets
    const filteredData = data.filter(set => {
      const logo = set.logo || '';
      const symbol = set.symbol || '';
      const setId = set.id || '';

      // Remove Pokémon TCG Pocket sets (they contain 'tcgp' in logo/symbol/id or start with 'A')
      const isPocket = logo.includes('/tcgp/') ||
                       symbol.includes('/tcgp/') ||
                       setId.includes('tcgp') ||
                       /^A\d+/.test(setId) || // Match IDs starting with A followed by numbers (A3a, A3b, etc.)
                       setId === 'A';


      return !isPocket;
    });

    console.log(`✅ Filtered ${data.length - filteredData.length} Pocket sets`);

    // Enhance with JustTCG images and ensure all sets have a logo
    const enhancedData = await Promise.all(filteredData.map(async (set) => {
        // Fix TCGdex logo URLs by adding .png extension if they don't have one
        let fixedLogo = set.logo;
        if (fixedLogo && !fixedLogo.match(/\.(png|jpg|jpeg|webp|svg)$/i)) {
            fixedLogo = `${fixedLogo}.png`;
        }

        // If no logo but has symbol, use the symbol as logo
        if (!fixedLogo && set.symbol) {
            fixedLogo = set.symbol;
            if (!fixedLogo.match(/\.(png|jpg|jpeg|webp|svg)$/i)) {
                fixedLogo = `${fixedLogo}.png`;
            }
        }

        return { ...set, logo: fixedLogo };
    }));

    // Get the last 50 sets (most recent) and reverse them so newest appears first
    const recentSets = enhancedData.slice(-50).reverse();

    // Fetch full details for each recent set to get accurate release dates
    const detailedSets = await Promise.all(recentSets.map(async (set) => {
        try {
            const setUrl = `https://api.tcgdex.net/v2/${language}/sets/${set.id}`;
            const response = await fetch(setUrl);
            if (!response.ok) {
                // If fetching details fails, return the original set data
                console.warn(`⚠️ Could not fetch details for set ${set.id}. Falling back to existing data.`);
                return {
                    ...set,
                    releaseDate: releaseDateMap[set.name] || null
                };
            }
            const detailedSetData = await response.json();
            return { 
                ...set, 
                ...detailedSetData, // This will add/overwrite with more accurate data like releaseDate
                logo: set.logo // Preserve the fixed logo from the initial fetch
            };
        } catch (err) {
            console.error(`❌ Error fetching details for set ${set.id}:`, err);
            // On error, return original set data with fallback release date
            return {
                ...set,
                releaseDate: releaseDateMap[set.name] || null
            };
        }
    }));

    console.log(`📦 Returning ${detailedSets.length} most recent sets with detailed data`);

    res.json(detailedSets);
  } catch (err) {
    console.error('❌ Error fetching sets:', err.message);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

// Get user's cards (protected route)
app.get('/api/cards', authenticateToken, async (req, res) => {
  try {
    const cards = await cardsCollection.find({ userId: req.user.id }).toArray();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Add card to user's collection (protected route)
app.post('/api/cards', authenticateToken, async (req, res) => {
  try {
    const { title, setId, cardNumber, language = 'en', condition } = req.body;
    if (!title || !setId || !cardNumber || !language) {
      return res.status(400).json({ error: 'Title, Set ID, Card Number, and Language are required' });
    }

    const validLanguages = ['en', 'ja', 'ko', 'zh', 'fr', 'de', 'es', 'it', 'pt'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    console.log('\n📝 Adding card using TCGdex:', { title, setId, cardNumber, language });

    // Use the specified language in the API call
    const cardUrl = `https://api.tcgdex.net/v2/${language}/sets/${setId}/${cardNumber}`;
    console.log(`🔍 Validating with TCGdex: ${cardUrl}`);

    const cardResponse = await fetch(cardUrl);
    if (!cardResponse.ok) {
      if (cardResponse.status === 404) {
        return res.status(404).json({ 
          error: `Card not found on TCGdex with Set ID "${setId}" and Card # "${cardNumber}" in ${language}` 
        });
      }
      throw new Error(`TCGdex API error: ${cardResponse.status}`);
    }

    const cardData = await cardResponse.json();
    console.log('✅ Found on TCGdex:', cardData.name);

    const card = {
      userId: req.user.id,
      username: req.user.username,
      title: cardData.name,
      setId,
      set: cardData.set.name || 'Unknown',
      cardNumber,
      language,
      rarity: cardData.rarity,
      cardId: cardData.id,
      variantId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      condition
    };

    const result = await cardsCollection.insertOne(card);
    console.log('✅ Card added with ID:', result.insertedId);
    card._id = result.insertedId;
    res.json({ success: true, data: card });
  } catch (err) {
    console.error('❌ Error adding card:', err.message);
    res.status(500).json({ error: 'Failed to add card', details: err.message });
  }
});

// Delete card from user's collection (protected route)
app.delete('/api/cards/:id', authenticateToken, async (req, res) => {
  try {
    const result = await cardsCollection.deleteOne({ 
      _id: new ObjectId(req.params.id),
      userId: req.user.id // Only delete if card belongs to user
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Card not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Updated cache with multi-language support
let tcgdexSetsCacheByLanguage = {};
let justTcgSetsCache = null;

async function getTCGdexSetIdByName(setName, language = 'en') {
  if (!tcgdexSetsCacheByLanguage[language]) {
    console.log(`❄️ Initializing TCGdex sets cache for ${language}...`);
    const response = await fetch(`https://api.tcgdex.net/v2/${language}/sets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch TCGdex sets for ${language}`);
    }
    const allSets = await response.json();

    // Filter out Pocket sets
    tcgdexSetsCacheByLanguage[language] = allSets.filter(set => {
      const logo = set.logo || '';
      const symbol = set.symbol || '';
      const setId = set.id || '';
      return !logo.includes('/tcgp/') &&
             !symbol.includes('/tcgp/') &&
             !setId.includes('tcgp') &&
             !/^A\d+/.test(setId) && // Exclude IDs starting with A followed by numbers
             setId !== 'A';
    });

    console.log(`✅ TCGdex ${language} cache initialized with ${tcgdexSetsCacheByLanguage[language].length} sets.`);
  }

  const set = tcgdexSetsCacheByLanguage[language].find(
    s => s.name.toLowerCase() === setName.toLowerCase()
  );
  return set ? set.id : null;
}

async function getJustTCGSetIdByName(setName) {
  if (!justTcgSetsCache) {
    console.log('❄️ Initializing JustTCG sets cache...');
    try {
      const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
      if (!JUSTTCG_API_KEY) {
        console.error('❌ JUSTTCG_API_KEY not configured');
        justTcgSetsCache = [];
        return null;
      }

      const response = await fetch('https://api.justtcg.com/v1/sets?game=pokemon', {
        headers: {
          'X-API-Key': JUSTTCG_API_KEY
        }
      });
      if (!response.ok) {
        throw new Error(`JustTCG API returned ${response.status}`);
      }
      let data = await response.json();

      // Handle different response structures
      if (data.data && Array.isArray(data.data)) {
        justTcgSetsCache = data.data;
      } else if (Array.isArray(data)) {
        justTcgSetsCache = data;
      } else {
        console.error('❌ Unexpected JustTCG sets response structure:', data);
        justTcgSetsCache = [];
        return null;
      }

      console.log(`✅ JustTCG sets cache initialized with ${justTcgSetsCache.length} sets.`);
    } catch (err) {
      console.error('❌ Failed to load JustTCG sets cache:', err.message);
      justTcgSetsCache = [];
      return null;
    }
  }

  if (!justTcgSetsCache || justTcgSetsCache.length === 0) {
    return null;
  }

  // Try exact match first
  let set = justTcgSetsCache.find(s => s.name && s.name.toLowerCase() === setName.toLowerCase());
  if (set) return set.id;

  // Try partial match (for cases where names differ slightly)
  const setLower = setName.toLowerCase();
  set = justTcgSetsCache.find(s => 
    s.name && (s.name.toLowerCase().includes(setLower) || setLower.includes(s.name.toLowerCase()))
  );

  return set ? set.id : null;
}

async function getJustTCGSetByName(setName) {
  // Ensure cache is populated by calling the other function
  await getJustTCGSetIdByName(setName);

  if (!justTcgSetsCache || justTcgSetsCache.length === 0) {
    return null;
  }

  // Try exact match first
  let set = justTcgSetsCache.find(s => s.name && s.name.toLowerCase() === setName.toLowerCase());
  if (set) return set;

  // Try partial match (for cases where names differ slightly)
  const setLower = setName.toLowerCase();
  set = justTcgSetsCache.find(s =>
    s.name && (s.name.toLowerCase().includes(setLower) || setLower.includes(s.name.toLowerCase()))
  );

  return set || null;
}

async function findCardOnJustTCG(cardQuery, justTcgSetId, tcgdexCardNumber) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.error('❌ JUSTTCG_API_KEY not configured');
      return null;
    }

    const cleanedCardName = extractCardName(cardQuery);
    let parts = cleanedCardName.split(' ');
    let name = parts[0];
    const searchUrl = `https://api.justtcg.com/v1/cards?q=${name}&game=pokemon&set=${justTcgSetId}`;
    console.log(`🔍 Searching JustTCG with cleaned name: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      headers: { 'X-API-Key': JUSTTCG_API_KEY }
    });

    if (!searchResponse.ok) {
      console.log(`⚠️  Could not search JustTCG for card "${cleanedCardName}" (${searchResponse.status})`);
      return null;
    }

    const searchResults = await searchResponse.json();
    const results = searchResults.data || searchResults;

    if (!results || !Array.isArray(results) || results.length === 0) {
      console.log(`⚠️  No JustTCG results for card "${cleanedCardName}" in set ${justTcgSetId}`);
      return null;
    }

    console.log(`✅ Found ${results.length} potential matches. Filtering by card number...`);

    const targetNum = parseInt(tcgdexCardNumber.replace(/^0+/, ''), 10);

    const matchingCards = results.filter(card => {
      if (!card.number) return false;
      const match = card.number.match(/^(\d+)/);
      if (!match) return false;
      const itemNum = parseInt(match[1], 10);
      return itemNum === targetNum;
    });

    if (matchingCards.length === 0) {
      console.log(`⚠️  Could not find any cards matching number "${tcgdexCardNumber}"`);
      return null;
    }

    // --- Strict Near-Mint variantId selection only ---
    const selectedCard = matchingCards[0]; // pick the first match, no condition logic

    if (!Array.isArray(selectedCard.variants) || selectedCard.variants.length === 0) {
      console.log(`ℹ️ No variants array — cannot select 'near-mint' variant`);
      return null;
    }

    const nmVariant = selectedCard.variants.find(
      v => typeof v.id === 'string' && /near[-\s]?mint/i.test(v.id)
    );

    if (!nmVariant || !nmVariant.id) {
      console.log(`⚠️ No variant ID containing 'near-mint' found — returning null`);
      return null;
    }

    const variantId = nmVariant.id;
    console.log(`✅ Using variant ID containing 'near-mint': ${variantId}`);

    console.log(`🔄 Fetching full details for variantId: ${variantId}`);
    const cardUrl = `https://api.justtcg.com/v1/cards?variantId=${variantId}`;
    const cardResponse = await fetch(cardUrl, {
      headers: { 'X-API-Key': JUSTTCG_API_KEY }
    });

    if (!cardResponse.ok) {
      console.log(`⚠️  Could not fetch card details from JustTCG (${cardResponse.status})`);
      return null;
    }

    const cardData = await cardResponse.json();
    const cardResult = (cardData.data && cardData.data[0]) || cardData[0];

    if (!cardResult) {
      console.log(`⚠️  No card data returned for variantId ${variantId}`);
      return null;
    }

    return cardResult;

  } catch (err) {
    console.error('❌ Error finding card on JustTCG:', err.message);
    return null;
  }
}

app.post('/search', async (req, res) => {
  try {
    const { title, cardId, cardNumber, set, rarity, language = 'en' } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔎 SEARCH REQUEST`);
    console.log(`Incoming Title: "${title}"`);
    console.log(`Incoming Card ID: ${cardId || 'N/A'}`);
    console.log(`Incoming Card #: ${cardNumber || 'N/A'}`);
    console.log(`Incoming Set: ${set || 'N/A'}`);
    console.log(`Incoming Rarity: ${rarity || 'N/A'}`);
    console.log(`Incoming Language: ${language}`);
    console.log(`${'='.repeat(50)}\n`);

    const finalSet = set || extractSetFromTitle(title);

    console.log('📍 Fetching eBay data...');
    const ebayData = await fetchEbayData(title, cardNumber, finalSet);
    console.log('✅ eBay complete');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Fetching TCGdex/TCGplayer data...');
    const tcgPlayerData = await fetchTCGPlayerDataFromTCGAPI(title, cardId, cardNumber, finalSet, language);
    console.log('✅ TCGdex complete');

    // If TCGdex has no price, try JustTCG as fallback
    let finalTCGPlayerData = tcgPlayerData;
    if ((!tcgPlayerData.averagePrice || tcgPlayerData.averagePrice === 'N/A') && process.env.JUSTTCG_API_KEY) {
      console.log('📍 TCGdex price unavailable, trying JustTCG fallback...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const justTcgData = await fetchJustTCGData(title, cardNumber, finalSet);
      if (justTcgData.averagePrice && justTcgData.averagePrice !== 'N/A') {
        console.log('✅ JustTCG fallback successful');
        finalTCGPlayerData = justTcgData;
      }
    }
    console.log('✅ JustTCG check complete');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Fetching Pokemon Price Tracker data...');
    const pokemonPriceTrackerData = await fetchPokemonPriceTrackerData(title, cardNumber, finalSet, language);
    console.log('✅ Pokemon Price Tracker complete');

    const result = {
      title,
      set: finalSet,
      cardNumber: cardNumber || 'N/A',
      language,
      ebay: ebayData,
      pokemonPriceTracker: pokemonPriceTrackerData,
      tcgPlayer: finalTCGPlayerData,
      lastUpdated: new Date().toISOString()
    };

    console.log(`${'='.repeat(50)}`);
    console.log(`✅ SEARCH COMPLETE`);
    console.log(`${'='.repeat(50)}\n`);

    res.json(result);
  } catch (err) {
    console.error('❌ Search Error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

function extractSetFromTitle(title) {
  const patterns = [
    /Crown Zenith/i, /Scarlet.*Violet/i, /Sword.*Shield/i, /Sun.*Moon/i, 
    /XY/i, /Black.*White/i, /Jungle/i, /Base Set/i, /Fossil/i, /Team Rocket/i,
    /Furious Fists/i, /Evolutions/i, /Team Up/i, /Unified Minds/i, /Cosmic Eclipse/i,
    /Rebel Clash/i, /Darkness Ablaze/i, /Vivid Voltage/i, /Battle Styles/i,
    /Chilling Reign/i, /Evolving Skies/i, /Fusion Strike/i, /Brilliant Stars/i,
    /Astral Radiance/i, /Lost Origin/i, /Silver Tempest/i, /Paldea Evolved/i,
    /Obsidian Flames/i
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[0];
  }
  return 'Unknown Set';
}

function extractCardName(title) {
  let name = title;
  name = name.replace(/\s*#?\d+\/\d+/g, '');
  name = name.replace(/\s*#\d+/g, '');
  name = name.replace(/\s+\d+$/, '');
  name = name.replace(/\s*-\s*(Holo|Reverse Holo|Non-Holo|Rare|Ultra Rare|Secret Rare|Promo|Foil|VMAX|VSTAR|GX|Break|Tag Team|Full Art|Alternate Art|Secret Rare|Hyper Rare|Rainbow Rare|Gold Rare|Shiny|Cosmo Holo|Prism Star|Radiant|Amazing Rare|Trainer|Energy)\b/gi, '');
  name = name.replace(/\s*\b(Pokemon|Card|TCG|Sealed|Lot|Bundle|Collection|Booster|Pack|Box|Case|Complete Set)\b/gi, '');
  name = name.trim().replace(/\s+/g, ' ');
  return name;
}

async function fetchEbayData(title, cardNumber, set) {
  try {
    const cleanedCardName = extractCardName(title);
    let searchQuery = cleanedCardName;
    if (cardNumber) {
      searchQuery += ` ${cardNumber}`;
      console.log(`🔍 Card number: "${cardNumber}"`);
    }
    if (set && set !== 'Unknown' && set !== 'Unknown Set') {
      searchQuery += ` ${set}`;
      console.log(`🔍 Set: "${set}"`);
    }
    console.log(`🔍 eBay search query: "${searchQuery}"`);

    const response = await fetch('https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'ebay-average-selling-price.p.rapidapi.com'
      },
      body: JSON.stringify({ keywords: searchQuery, max_search_results: 240 })
    });

    if (!response.ok) throw new Error(`eBay API error: ${response.status}`);

    const apiData = await response.json();
    const items = apiData.products || apiData.items || [];
    console.log(`📊 eBay returned ${items.length} total items`);

    const cardName = extractCardName(title);
    const normalizeNum = (num) => num ? num.replace(/^0+/, '').toLowerCase() : '';
    const targetCardNum = cardNumber ? normalizeNum(cardNumber) : null;

    console.log(`🎯 Strict matching for:`);
    console.log(`   Card Name: "${cardName}"`);
    if (targetCardNum) console.log(`   Card #: ${targetCardNum}`);
    if (set && set !== 'Unknown' && set !== 'Unknown Set') console.log(`   Set: ${set}`);

    const gradingCompanies = ['psa', 'cgc', 'bgs', 'tag', 'ace'];
    const irrelevantTerms = ['lot', 'bundle', 'collection', 'booster', 'pack', 'box', 'sealed', 'case', 'complete set'];

    const relevantCards = items.filter((item, index) => {
      const itemTitle = (item.title || '').toLowerCase();
      console.log(`\n--- Filtering item ${index + 1}: "${item.title}" ---`);

      if (gradingCompanies.some(co => itemTitle.includes(co)) || /\b(psa|cgc|bgs|tag|ace)\s+\d+/i.test(itemTitle)) {
        console.log('  Excluded: Graded card');
        return false;
      }

      if (irrelevantTerms.some(term => itemTitle.includes(term))) {
        console.log('  Excluded: Irrelevant term (lot, sealed, etc.)');
        return false;
      }

      const cardNameLower = cardName.toLowerCase();
      const cardNameWords = cardNameLower.split(' ').filter(w => w.length > 2);
      const allWordsPresent = cardNameWords.every(word => itemTitle.includes(word));

      if (!allWordsPresent) {
        console.log(`  Excluded: Card name words not all present. Missing: ${cardNameWords.filter(word => !itemTitle.includes(word)).join(', ')}`);
        return false;
      }

      if (targetCardNum) {
        const numPatterns = [
          /\b(\d+)\/\d+\b/,
          /#(\d+)\b/,
          /\bno\.?\s*(\d+)\b/i,
          /\bnumber\s+(\d+)\b/i
        ];
        let foundMatchingNum = false;
        let foundConflictingNum = false;

        for (const pattern of numPatterns) {
          const match = itemTitle.match(pattern);
          if (match) {
            const itemNum = normalizeNum(match[1]);
            if (itemNum === targetCardNum) {
              foundMatchingNum = true;
              break;
            } else {
              foundConflictingNum = true;
              break;
            }
          }
        }

        if (foundConflictingNum) {
          console.log(`  Excluded: Conflicting card number found. Expected: ${targetCardNum}`);
          return false;
        }
      }

      if (set && set !== 'Unknown' && set !== 'Unknown Set') {
        const setLower = set.toLowerCase();
        const setWords = setLower.split(' ').filter(w => w.length > 2);
        if (!itemTitle.includes(setLower)) {
          const setWordsPresent = setWords.filter(word => itemTitle.includes(word));
          if (setWordsPresent.length < Math.ceil(setWords.length * 0.6)) {
            console.log(`  Excluded: Set name mismatch. Expected: ${setLower}, Found words: ${setWordsPresent.join(', ')}`);
            return false;
          }
        }
      }

      const price = item.sale_price || item.currentPrice?.value || 0;
      if (price <= 0 || price > 100000) {
        console.log(`  Excluded: Price out of range: ${price}`);
        return false;
      }

      console.log('  ✅ Matched');
      return true;
    });

    console.log(`✅ After strict filtering: ${relevantCards.length} matching cards`);

    if (relevantCards.length === 0) {
      console.log('⚠️  No cards matched all criteria');
      return { 
        averagePrice: 'N/A', 
        listings: [], 
        source: 'eBay', 
        note: `No exact matches found for ${cardName}${targetCardNum ? ` #${targetCardNum}` : ''}${set && set !== 'Unknown' ? ` (${set})` : ''}`
      };
    }

    const recentSold = relevantCards.slice(0, 5).map(item => ({
      title: (item.title || 'Unknown').replace(/Opens in a new window or tab/gi, '').trim(),
      sale_price: item.sale_price || item.currentPrice?.value || 0,
      condition: item.condition?.conditionDisplayName || 'Unknown',
      date_sold: item.date_sold || 'Unknown',
      link: item.link || '#'
    }));

    const allPrices = relevantCards.map(item => item.sale_price || item.currentPrice?.value || 0).filter(p => p > 0);
    const averagePrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;

    console.log(`💰 Average: $${averagePrice.toFixed(2)} from ${relevantCards.length} sales`);
    console.log(`📋 Showing top ${recentSold.length} recent sales`);

    return { 
      averagePrice: parseFloat(averagePrice.toFixed(2)), 
      listings: recentSold, 
      source: 'eBay',
      filteredFrom: items.length,
      matchedCards: relevantCards.length
    };
  } catch (err) {
    console.error('❌ eBay fetch error:', err);
    return { error: 'Failed', source: 'eBay', averagePrice: 'N/A' };
  }
}

async function fetchTCGPlayerDataFromTCGAPI(title, cardId = null, cardNumber = null, set = null, language = 'en') {
  try {
    let tcgdexUrl;
    let cardIdentifier = cardId;

    if (!cardIdentifier && set && cardNumber) {
      const cardSetId = await getTCGdexSetIdByName(set, language);
      if (cardSetId) {
        cardIdentifier = `${cardSetId}-${cardNumber}`;
        console.log(`🔧 Constructed Card ID: ${cardIdentifier}`);
      } else {
        console.log(`⚠️ Could not find a set ID for "${set}" in ${language}`);
        // Try JustTCG as fallback
        console.log('🔄 Trying JustTCG as fallback...');
        return await fetchJustTCGData(title, cardNumber, set);
      }
    }

    if (!cardIdentifier) {
      return { averagePrice: 'N/A', source: 'TCGplayer', note: 'Card ID or Set/Number are required.' };
    }

    tcgdexUrl = `https://api.tcgdex.net/v2/${language}/cards/${cardIdentifier}`;
    console.log(`🔍 Fetching from TCGdex (${language}): ${tcgdexUrl}`);

    const tcgdexResponse = await fetch(tcgdexUrl);
    if (!tcgdexResponse.ok) {
      console.log(`⚠️ TCGdex fetch failed with status: ${tcgdexResponse.status}`);
      // Try JustTCG as fallback
      if (cardNumber && set) {
        console.log('🔄 Trying JustTCG as fallback...');
        return await fetchJustTCGData(title, cardNumber, set);
      }
      return { averagePrice: 'N/A', source: 'TCGplayer', note: `Card not found in TCGdex (${tcgdexResponse.status})` };
    }

    const cardData = await tcgdexResponse.json();
    const prices = cardData?.pricing?.tcgplayer;
    let price = 'N/A';
    let priceType = 'N/A';

    if (prices?.holofoil?.marketPrice) {
        price = prices.holofoil.marketPrice;
        priceType = 'Holofoil Market';
    } else if (prices?.reverseHolofoil?.marketPrice) {
        price = prices.reverseHolofoil.marketPrice;
        priceType = 'Reverse Holofoil Market';
    } else if (prices?.normal?.marketPrice) {
        price = prices.normal.marketPrice;
        priceType = 'Normal Market';
    } else {
        const firstAvailable = Object.values(prices || {}).find(p => p && p.marketPrice);
        if (firstAvailable) {
            price = firstAvailable.marketPrice;
            priceType = 'Fallback Market';
        }
    }

    if (price !== 'N/A') {
      console.log(`✅ Found TCGplayer price from TCGdex: ${price} (${priceType})`);
      return { averagePrice: price, source: 'TCGplayer (TCGdex)', cardName: cardData.name, language };
    } else {
      console.log('⚠️ No TCGplayer market price found in TCGdex response.');
      // Try JustTCG as fallback
      if (cardNumber && set) {
        console.log('🔄 Trying JustTCG as fallback...');
        const justTcgResult = await fetchJustTCGData(title, cardNumber, set);
        if (justTcgResult.averagePrice && justTcgResult.averagePrice !== 'N/A') {
          return justTcgResult;
        }
      }
      return { averagePrice: 'N/A', source: 'TCGplayer', cardName: cardData.name, note: 'Price unavailable', language };
    }

  } catch (err) {
    console.error('❌ TCGdex/TCGplayer fetch error:', err);
    // Try JustTCG as final fallback
    if (cardNumber && set) {
      console.log('🔄 Trying JustTCG as fallback after error...');
      return await fetchJustTCGData(title, cardNumber, set);
    }
    return { averagePrice: 'N/A', source: 'TCGplayer' };
  }
}

async function fetchJustTCGData(title, cardNumber = null, set = null) {
  try {
    // Check for API key first
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.log('⚠️  JUSTTCG_API_KEY not configured - cannot fetch from JustTCG');
      return { averagePrice: 'N/A', source: 'JustTCG', note: 'API key not configured' };
    }

    if (!cardNumber || !set || set === 'Unknown' || set === 'Unknown Set') {
      console.log('⚠️  JustTCG requires card number and set name');
      return { averagePrice: 'N/A', source: 'JustTCG', note: 'Missing card number or set' };
    }

    console.log(`🔍 Searching JustTCG for: ${title} #${cardNumber} in ${set}`);

    const justTcgSetId = await getJustTCGSetIdByName(set);
    if (!justTcgSetId) {
      console.log(`⚠️  Could not find JustTCG set matching "${set}"`);
      return { averagePrice: 'N/A', source: 'JustTCG', note: `Set "${set}" not found on JustTCG` };
    }

    const cardResult = await findCardOnJustTCG(title, justTcgSetId, cardNumber);
    if (!cardResult) {
      console.log(`⚠️  Card #${cardNumber} not found in JustTCG set ${justTcgSetId}`);
      return { averagePrice: 'N/A', source: 'JustTCG', note: `Card #${cardNumber} not found in ${set}` };
    }

    if (!cardResult.variants || cardResult.variants.length === 0) {
      console.log('⚠️  No variants found for this card');
      return { averagePrice: 'N/A', source: 'JustTCG', cardName: cardResult.name, note: 'No variants found' };
    }

    const nearMintVariant = cardResult.variants.find(v => v.id.toLowerCase().includes('near-mint'));
    if (!nearMintVariant) {
      console.log('⚠️  No Near-Mint variant found');
      return { averagePrice: 'N/A', source: 'JustTCG', cardName: cardResult.name, note: 'No Near-Mint variant found' };
    }

    const price = nearMintVariant.price;
    if (!price) {
      console.log('⚠️  No price available on Near-Mint variant');
      return { averagePrice: 'N/A', source: 'JustTCG', cardName: cardResult.name, note: 'Price unavailable' };
    }

    console.log(`✅ Found Near-Mint price from JustTCG: ${price} for ${cardResult.name}`);

    return {
      averagePrice: parseFloat(price),
      source: 'TCGplayer (JustTCG)',
      cardName: cardResult.name,
      cardNumber: cardResult.number,
      setName: set
    };

  } catch (err) {
    console.error('❌ JustTCG fetch error:', err.message);
    return { averagePrice: 'N/A', source: 'JustTCG' };
  }
}

async function fetchPokemonPriceTrackerData(title, cardNumber = null, set = null, language = 'en') {
  try {
    const POKEMONPRICETRACKER_API_KEY = process.env.POKEMONPRICETRACKER_API_KEY;
    if (!POKEMONPRICETRACKER_API_KEY) {
      console.log('⚠️  POKEMONPRICETRACKER_API_KEY not configured');
      return { averagePrice: 'N/A', source: 'Pokemon Price Tracker' };
    }

    const timeSinceLastCall = Date.now() - lastPPTCallTime;
    if (timeSinceLastCall < MIN_CALL_INTERVAL) {
      const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before Pokemon Price Tracker call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const cleanedCardName = extractCardName(title);
    let searchName = '';
    const words = cleanedCardName.split(' ');
    if (words.length > 1 && words[0].toLowerCase().includes('team')) {
        searchName = words[words.length - 1];
    } else {
        searchName = words.slice(0, 2).join(' ');
    }
    console.log(`🔪 Using smart name for Pokemon Price Tracker: "${searchName}"`);

    const searchUrl = new URL('https://www.pokemonpricetracker.com/api/v2/cards');
    searchUrl.searchParams.append('limit', '5');

    if (set && set !== 'Unknown' && set !== 'Unknown Set') {
      console.log(`🔍 Using Set Name for Search: "${set}"`);
      searchUrl.searchParams.append('search', searchName);
      searchUrl.searchParams.append('set', set);
    } else {
      searchUrl.searchParams.append('search', searchName);
    }

    console.log(`🔍 Pokemon Price Tracker Search URL: ${searchUrl.toString()}`);
    lastPPTCallTime = Date.now();

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POKEMONPRICETRACKER_API_KEY}`,
      }
    });

    if (!response.ok) {
      console.log(`⚠️  Pokemon Price Tracker API returned ${response.status}`);
      return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data || !data.data || data.data.length === 0) {
      console.log('📊 Pokemon Price Tracker returned 0 results');
      return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note: 'No matching cards found' };
    }

    console.log(`📊 Pokemon Price Tracker returned ${data.data.length} results`);

    let cardToUse = null;

    if (cardNumber) {
      console.log(`🔍 Searching for card number: ${cardNumber}`);
      const exactMatch = data.data.find(card => card.cardNumber === cardNumber);
      if (exactMatch) {
        console.log(`✅ Found exact match by card number: ${exactMatch.name} #${exactMatch.cardNumber}`);
        cardToUse = exactMatch;
      } else {
        console.log(`⚠️ Card number #${cardNumber} not found. Falling back to first result.`);
        cardToUse = data.data[0];
      }
    } else {
      cardToUse = data.data[0];
    }

    if (!cardToUse) {
        const note = 'No cards found in API response.';
        console.log(`⚠️ ${note}`);
        return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note };
    }

    const price = cardToUse.prices?.market;

    if (price !== null && price !== undefined) {
      console.log(`✅ Found Pokemon Price Tracker price: $${price} for ${cardToUse.name}`);
      return {
        averagePrice: parseFloat(price),
        source: 'Pokemon Price Tracker',
        cardName: cardToUse.name,
        cardNumber: cardToUse.cardNumber,
        setName: cardToUse.set?.name || set
      };
    } else {
      console.log(`⚠️  No market price available for ${cardToUse.name}`);
      return {
        averagePrice: 'N/A',
        source: 'Pokemon Price Tracker',
        cardName: cardToUse.name,
        note: 'Price unavailable'
      };
    }

  } catch (err) {
    console.error('❌ Pokemon Price Tracker fetch error:', err.message);
    return { averagePrice: 'N/A', source: 'Pokemon Price Tracker' };
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(bodyParser.json());
app.use(express.static(__dirname));

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let cardsCollection;

client.connect().then(() => {
  const db = client.db('pokemon_cards');
  cardsCollection = db.collection('cards');
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const checkAPIs = () => {
  console.log('\n📡 API Configuration Status:');
  console.log('-----------------------------------');
  console.log(process.env.RAPIDAPI_KEY ? '✅ RapidAPI Key (eBay): Configured' : '❌ RapidAPI Key (eBay): NOT configured');
  console.log(process.env.JUSTTCG_API_KEY ? '✅ JUSTTCG API Key: Configured' : '❌ JUSTTCG API Key: NOT configured');
  console.log(process.env.PRICECHARTING_API_KEY ? '✅ PriceCharting API Key: Configured' : '⚠️  PriceCharting API Key: NOT configured (optional)');
  console.log('-----------------------------------\n');
};

setTimeout(checkAPIs, 1000);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.get('/api/sets', async (req, res) => {
  try {
    const url = 'https://api.justtcg.com/v1/sets?game=pokemon';
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;

    if (!JUSTTCG_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch(url, {
      headers: { 'X-API-Key': JUSTTCG_API_KEY }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching sets:', err.message);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

app.get('/api/cards', async (req, res) => {
  try {
    const cards = await cardsCollection.find({}).toArray();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const { title, setId, cardNumber, language } = req.body;

    if (!title || !setId || !cardNumber || !language) {
      return res.status(400).json({ error: 'Title, Set, Card Number, and Language are required' });
    }

    console.log('\n📝 Adding card:', { title, setId, cardNumber, language });

    const cardsUrl = `https://api.justtcg.com/v1/cards?set=${setId}&q=${encodeURIComponent(title)}&game=Pokemon&limit=15`;
    console.log(`🔍 Searching cards: ${cardsUrl}`);

    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.log('⚠️  No JUSTTCG API key');
      return res.status(400).json({ error: 'API key not configured' });
    }

    const cardsResponse = await fetch(cardsUrl, { 
      headers: { 'X-API-Key': JUSTTCG_API_KEY } 
    });

    if (!cardsResponse.ok) {
      throw new Error(`Cards API error: ${cardsResponse.status}`);
    }

    const cardsData = await cardsResponse.json();
    console.log('JUSTTCG Cards API Response:', JSON.stringify(cardsData, null, 2)); // Added logging
    if (!cardsData.data || cardsData.data.length === 0) {
      console.log(`⚠️  No cards found for "${title}"`);
      return res.status(400).json({ error: 'Card not found' });
    }

    const normalizeFullCardNum = (num) => {
      if (!num) return '';
      const parts = num.split('/');
      return parts.map(p => {
        if (/^\d+$/.test(p)) {
          return p.replace(/^0+/, '') || '0';
        }
        return p;
      }).join('/').toLowerCase();
    };

    const targetNum = normalizeFullCardNum(cardNumber);
    console.log(`Looking for card number: "${targetNum}"`);
    console.log('JUSTTCG API data for matching:', JSON.stringify(cardsData.data.map(c => ({ number: c.number, name: c.name })), null, 2)); // Added logging

    const exactMatch = cardsData.data.find(c => {
      const apiNum = normalizeFullCardNum(c.number || '');
      if (apiNum === targetNum) {
        console.log(`✓ Match found: "${c.number}"`);
        return true;
      }
      return false;
    });

    if (!exactMatch) {
      console.log(`❌ No card with number "${cardNumber}" found`);
      return res.status(400).json({ error: `Card #${cardNumber} not found` });
    }

    console.log(`✅ Found: ${exactMatch.name} (#${exactMatch.number})`);

    let variantId = null;
    if (exactMatch.variants && exactMatch.variants.length > 0) {
      const validVariants = exactMatch.variants.filter(v => {
        const vType = (v.type || '').toLowerCase();
        const vName = (v.name || '').toLowerCase();
        return !vType.includes('sealed') && !vName.includes('tournament') && !vName.includes('championship');
      });

      if (validVariants.length > 0) {
        const holoVariant = validVariants.find(v => (v.name || '').toLowerCase().includes('holofoil'));
        variantId = holoVariant?.id || validVariants[0]?.id;
        console.log(`Selected variant: ${holoVariant?.name || validVariants[0]?.name}`);
      } else {
        variantId = exactMatch.variants[0]?.id;
      }
    }

    const card = {
      title,
      setId,
      set: exactMatch.set_name || 'Unknown',
      cardNumber,
      language,
      cardId: exactMatch.id || null,
      variantId: variantId || null,
      createdAt: new Date(),
      updatedAt: new Date()
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

app.delete('/api/cards/:id', async (req, res) => {
  try {
    await cardsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

app.post('/search', async (req, res) => {
  try {
    const { title, variantId, cardNumber, set } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔎 SEARCH REQUEST`);
    console.log(`Incoming Title: "${title}"`);
    console.log(`Incoming Card #: ${cardNumber || 'N/A'}`);
    console.log(`Incoming Set: ${set || 'N/A'}`);
    if (variantId) console.log(`Variant ID: ${variantId}`);
    console.log(`${'='.repeat(50)}\n`);

    // Extract set from title if not provided
    const finalSet = set || extractSetFromTitle(title);

    console.log('📍 Fetching eBay data...');
    const ebayData = await fetchEbayData(title, cardNumber, finalSet);
    console.log('✅ eBay complete');

    // Add delay between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Fetching JUSTTCG data...');
    const tcgPlayerData = await fetchTCGPlayerDataFromTCGAPI(title, variantId);
    console.log('✅ JUSTTCG complete');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Fetching PriceCharting data...');
    const priceChartingData = await fetchPriceChartingData(title);
    console.log('✅ PriceCharting complete');

    const result = {
      title,
      set: finalSet,
      cardNumber: cardNumber || 'N/A',
      ebay: ebayData,
      priceCharting: priceChartingData,
      tcgPlayer: tcgPlayerData,
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
  const patterns = [/Crown Zenith/i, /Scarlet.*Violet/i, /Sword.*Shield/i, /Sun.*Moon/i, /XY/i, /Black.*White/i, /Jungle/i, /Base Set/i, /Fossil/i];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[0];
  }
  return 'Unknown Set';
}

function extractCardName(title) {
  let name = title;

  // Remove card numbers like "194/203" or "#194"
  name = name.replace(/\s*#?\d+\/\d+/g, '');
  name = name.replace(/\s*#\d+/g, '');

  // Remove set names
  const setPatterns = [
    /Crown Zenith/i, /Scarlet.*Violet/i, /Sword.*Shield/i, 
    /Sun.*Moon/i, /XY/i, /Black.*White/i, /Jungle/i, 
    /Base Set/i, /Fossil/i, /Team Rocket/i, /Gym\s+(Heroes|Challenge)/i
  ];

  for (const pattern of setPatterns) {
    name = name.replace(pattern, '');
  }

  // Remove common suffixes and irrelevant terms
  name = name.replace(/\s*-\s*(Holo|Reverse Holo|Non-Holo|Rare|Ultra Rare|Secret Rare|Promo|Foil|VMAX|VSTAR|GX|EX|Mega|Break|Tag Team|Full Art|Alternate Art|Secret Rare|Hyper Rare|Rainbow Rare|Gold Rare|Shiny|Cosmo Holo|Prism Star|Radiant|Amazing Rare|Trainer|Energy)\b/gi, '');
  name = name.replace(/\s*\b(Pokemon|Card|TCG|Sealed|Lot|Bundle|Collection|Booster|Pack|Box|Case|Complete Set)\b/gi, '');

  // Clean up whitespace
  name = name.trim().replace(/\s+/g, ' ');

  return name;
}

async function fetchEbayData(title, cardNumber, set) {
  try {
    // Build a more specific search query using the cleaned card name
    const cleanedCardName = extractCardName(title);
    let searchQuery = cleanedCardName;

    // Add the card number to the search query if it exists
    if (cardNumber) {
      searchQuery += ` ${cardNumber}`;
    }

    // Add the set to the search query if it exists and is not "Unknown"
    if (set && set !== 'Unknown' && set !== 'Unknown Set') {
      searchQuery += ` ${set}`;
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

    // Extract and prepare search criteria
    const cardName = extractCardName(title);
    const normalizeNum = (num) => {
      if (!num) return '';
      return num.replace(/^0+/, '').toLowerCase();
    };
    const targetCardNum = cardNumber ? normalizeNum(cardNumber) : null;

    console.log(`🎯 Strict matching for:`);
    console.log(`   Card Name: "${cardName}"`);
    if (targetCardNum) console.log(`   Card #: ${targetCardNum}`);
    if (set && set !== 'Unknown' && set !== 'Unknown Set') console.log(`   Set: ${set}`);

    // Define exclusion terms
    const gradingCompanies = ['psa', 'cgc', 'bgs', 'tag', 'ace'];
    const irrelevantTerms = ['lot', 'bundle', 'collection', 'booster', 'pack', 'box', 'sealed', 'case', 'complete set'];

    const relevantCards = items.filter((item, index) => {
      const itemTitle = (item.title || '').toLowerCase();
      console.log(`\n--- Filtering item ${index + 1}: "${item.title}" ---`);

      // Step 1: Exclude graded cards
      if (gradingCompanies.some(co => itemTitle.includes(co)) || /\b(psa|cgc|bgs|tag|ace)\s+\d+/i.test(itemTitle)) {
        console.log('  Excluded: Graded card');
        return false;
      }

      // Step 2: Exclude lots and sealed products
      if (irrelevantTerms.some(term => itemTitle.includes(term))) {
        console.log('  Excluded: Irrelevant term (lot, sealed, etc.)');
        return false;
      }

      // Step 3: STRICT card name matching
      const cardNameLower = cardName.toLowerCase();
      const cardNameWords = cardNameLower.split(' ').filter(w => w.length > 2);

      const allWordsPresent = cardNameWords.every(word => itemTitle.includes(word));
      if (!allWordsPresent) {
        console.log(`  Excluded: Card name words not all present. Missing: ${cardNameWords.filter(word => !itemTitle.includes(word)).join(', ')}`);
        return false;
      }

      // Step 4: STRICT card number matching (if provided)
      if (targetCardNum) {
        const numPatterns = [
          /\b(\d+)\/\d+\b/,           // Format: 194/203
          /#(\d+)\b/,                  // Format: #194
          /\bno\.?\s*(\d+)\b/i,       // Format: No. 194 or No.194
          /\bnumber\s+(\d+)\b/i       // Format: Number 194
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

      // Step 5: STRICT set matching (if provided)
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

      // Step 6: Price sanity check (exclude obviously wrong prices)
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

    // Take the 5 most recent sales
    const recentSold = relevantCards.slice(0, 5).map(item => ({
      title: (item.title || 'Unknown').replace(/Opens in a new window or tab/gi, '').trim(),
      sale_price: item.sale_price || item.currentPrice?.value || 0,
      condition: item.condition?.conditionDisplayName || 'Unknown',
      date_sold: item.date_sold || 'Unknown',
      link: item.link || '#'
    }));

    // Calculate average from all filtered results (not just top 5)
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

async function fetchTCGPlayerDataFromTCGAPI(title, variantId = null) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) return { averagePrice: 'N/A', source: 'JUSTTCG' };

    if (variantId && variantId !== '') {
      console.log(`📌 Fetching card by variantId: ${variantId}`);
      const cardUrl = `https://api.justtcg.com/v1/cards?variantId=${variantId}`;
      const response = await fetch(cardUrl, { headers: { 'X-API-Key': JUSTTCG_API_KEY } });

      if (response.ok) {
        const data = await response.json();

        if (data?.data?.length > 0) {
          const card = data.data[0];
          const price = card?.variants?.[0]?.price ?? card?.market_price ?? card?.price ?? 'N/A';

          console.log(`✅ Card price from variant: ${price}`);
          return { averagePrice: price, source: 'JUSTTCG (Pokémon Cards)', variantId };
        }
      }

      console.log('⚠️ Card fetch by variant failed, falling back to search');
    }

    const searchUrl = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(title)}&game=Pokemon&limit=20`;
    const response = await fetch(searchUrl, { headers: { 'X-API-Key': JUSTTCG_API_KEY } });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    if (!data.data || data.data.length === 0) return { averagePrice: 'N/A', source: 'JUSTTCG' };

    const cards = data.data.filter(c => {
      const type = (c.type || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return !(type.includes('sealed') || name.includes('booster') || name.includes('box') || 
               name.includes('deck') || name.includes('bundle') || name.includes('collection'));
    });

    if (cards.length === 0) return { averagePrice: 'N/A', source: 'JUSTTCG', note: 'Only sealed found' };

    const card = cards[0];
    console.log(`Found: ${card.name}`);
    const price = card.price || card.market_price || (card.variants?.[0]?.price) || 'N/A';
    console.log(`Price: ${price}`);

    return { averagePrice: price, source: 'JUSTTCG (Pokémon Cards)', cardName: card.name };
  } catch (err) {
    console.error('❌ JUSTTCG error:', err);
    return { averagePrice: 'N/A', source: 'JUSTTCG' };
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
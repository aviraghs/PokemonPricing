import { NextRequest, NextResponse } from 'next/server';
import { RequestQueue, extractCardName } from '@/lib/card-helpers';

const CARD_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
const cardDataCache = new Map<string, { cards: any[]; timestamp: number }>();

const tcgdexQueue = new RequestQueue(50);
const pricingQueue = new RequestQueue(100);

// Currency conversion rate (USD to INR)
let currentExchangeRate = 88.72; // Default fallback rate
let lastExchangeRateUpdate = null;
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// JustTCG rate limit tracking
let justTcgRateLimited = false;
let justTcgRateLimitReset = 0;

// Fetch latest USD to INR exchange rate from multiple sources
async function fetchExchangeRate() {
  console.log('💱 Fetching latest USD to INR exchange rate...');

  // Try multiple APIs in order of preference for accuracy
  const apis = [
    {
      name: 'ExchangeRate-API',
      url: 'https://open.er-api.com/v6/latest/USD',
      parse: (data: any) => data.rates?.INR
    },
    {
      name: 'ExchangeRate.host',
      url: 'https://api.exchangerate.host/latest?base=USD&symbols=INR',
      parse: (data: any) => data.rates?.INR
    },
    {
      name: 'Frankfurter',
      url: 'https://api.frankfurter.app/latest?from=USD&to=INR',
      parse: (data: any) => data.rates?.INR
    },
    {
      name: 'CurrencyAPI (Fawaz)',
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      parse: (data: any) => data.usd?.inr
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
      console.log(`   ❌ ${api.name} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // If all APIs failed
  console.error('❌ All exchange rate APIs failed');
  console.log(`⚠️  Using fallback rate: 1 USD = ₹${currentExchangeRate} INR`);
}

// Get TCGdex set ID by name
async function getTCGdexSetIdByName(setName: string, language = 'en') {
  try {
    const response = await fetch(`https://api.tcgdex.net/v2/${language}/sets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch TCGdex sets for ${language}`);
    }
    const allSets = await response.json();

    // Filter out Pocket sets
    const filteredSets = allSets.filter((set: any) => {
      const logo = set.logo || '';
      const symbol = set.symbol || '';
      const setId = set.id || '';
      return !logo.includes('/tcgp/') &&
             !symbol.includes('/tcgp/') &&
             !setId.includes('tcgp') &&
             !/^A\d+/.test(setId) && // Exclude IDs starting with A followed by numbers
             setId !== 'A';
    });

    const set = filteredSets.find(
      (s: any) => s.name.toLowerCase() === setName.toLowerCase()
    );
    return set ? set.id : null;
  } catch (err) {
    console.error(`❌ Error getting TCGdex set ID for "${setName}":`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Get JustTCG set ID by name
async function getJustTCGSetIdByName(setName: string) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.error('❌ JUSTTCG_API_KEY not configured');
      return null;
    }

    const response = await fetch('https://api.justtcg.com/v1/sets?game=pokemon', {
      headers: {
        'X-API-Key': JUSTTCG_API_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    
    // Check for rate limiting
    if (response.status === 429) {
      console.log(`⚠️ JustTCG API rate limited: ${response.status}`);
      // Check for rate limit headers
      const retryAfter = response.headers.get('Retry-After');
      const rateLimit = response.headers.get('X-RateLimit-Limit');
      const rateRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateReset = response.headers.get('X-RateLimit-Reset');

      console.log(`   Rate Limit Info - Limit: ${rateLimit}, Remaining: ${rateRemaining}, Reset: ${rateReset}, Retry-After: ${retryAfter}`);

      // Set global rate limit flag
      justTcgRateLimited = true;
      justTcgRateLimitReset = Date.now() + (60 * 60 * 1000); // Reset in 1 hour
      console.log('🚫 JustTCG rate limited - disabling for 1 hour');

      throw new Error(`JustTCG API rate limited: ${response.status}. Retry after: ${retryAfter || 'unknown'} seconds`);
    }
    
    if (!response.ok) {
      // Check if it's another type of rate limit or error
      if (response.status === 402 || response.status === 403) {
        const rateLimit = response.headers.get('X-RateLimit-Limit');
        const rateRemaining = response.headers.get('X-RateLimit-Remaining');
        console.log(`⚠️ JustTCG API access issue: ${response.status}, Remaining: ${rateRemaining}/${rateLimit}`);
      }
      throw new Error(`JustTCG API returned ${response.status}`);
    }
    
    // Extract rate limit information if available
    const rateLimit = response.headers.get('X-RateLimit-Limit');
    const rateRemaining = response.headers.get('X-RateLimit-Remaining');
    if (rateLimit && rateRemaining) {
      console.log(`📊 JustTCG Rate Limit: ${rateRemaining}/${rateLimit} requests remaining`);
    }
    
    let data = await response.json();

    // Handle different response structures
    const justTcgSets = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

    if (!Array.isArray(justTcgSets)) {
      console.error('❌ Unexpected JustTCG sets response structure:', data);
      return null;
    }

    // Clean the set name for comparison
    const cleanSetName = setName.replace(/['"]/g, '').trim();
    const setLower = cleanSetName.toLowerCase();

    // Try exact match first
    let set = justTcgSets.find((s: any) => s.name && s.name.toLowerCase() === setLower);
    if (set) {
      console.log(`✅ Exact match found: "${set.name}" (ID: ${set.id})`);
      return set.id;
    }

    // Try partial match
    set = justTcgSets.find((s: any) =>
      s.name && (s.name.toLowerCase().includes(setLower) || setLower.includes(s.name.toLowerCase()))
    );
    if (set) {
      console.log(`✅ Partial match found: "${set.name}" (ID: ${set.id})`);
      return set.id;
    }

    console.log(`⚠️ No JustTCG set found matching: "${cleanSetName}"`);
    return null;
  } catch (err) {
    console.error('❌ Failed to get JustTCG set ID:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Fetch pricing data for a card
async function fetchTCGPlayerDataFromTCGAPI(title: string, cardId: string | null, cardNumber: string | null, set: string | null, language = 'en', useJustTCGFallback = false) {
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
        return { averagePrice: 'N/A', source: 'TCGplayer', note: `Set "${set}" not found in TCGdex` };
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
        const firstAvailable = Object.values(prices || {}).find((p: any) => p && p.marketPrice) as any;
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
      console.log(`   useJustTCGFallback: ${useJustTCGFallback}, cardNumber: ${cardNumber}, set: ${set}, hasApiKey: ${!!process.env.JUSTTCG_API_KEY}`);

      // ONLY try JustTCG as fallback if enabled (disabled for main page, enabled for search results)
      if (useJustTCGFallback && cardNumber && set && process.env.JUSTTCG_API_KEY) {
        console.log('🔄 TCGdex has no pricing - trying JustTCG as fallback...');
        const justTcgResult = await fetchJustTCGData(title, cardNumber, set);
        console.log(`   JustTCG result:`, JSON.stringify(justTcgResult, null, 2));

        if (justTcgResult.averagePrice && justTcgResult.averagePrice !== 'N/A') {
          console.log('✅ Found price from JustTCG fallback');
          return justTcgResult;
        } else {
          console.log('⚠️ JustTCG fallback did not return a valid price');
        }
      } else {
        console.log('⚠️ JustTCG fallback not triggered - conditions not met');
      }
      return { averagePrice: 'N/A', source: 'TCGplayer', cardName: cardData.name, note: 'Price unavailable', language };
    }

  } catch (err) {
    console.error('❌ TCGdex/TCGplayer fetch error:', err);
    return { averagePrice: 'N/A', source: 'TCGplayer', note: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Fetch JustTCG data for a card
async function fetchJustTCGData(title: string, cardNumber: string | null, set: string | null) {
  try {
    // Check if we're currently rate limited
    if (justTcgRateLimited && Date.now() < justTcgRateLimitReset) {
      const remainingMinutes = Math.ceil((justTcgRateLimitReset - Date.now()) / 60000);
      console.log(`⚠️  JustTCG rate limited - skipping (resets in ~${remainingMinutes} min)`);
      return { averagePrice: 'N/A', source: 'JustTCG', note: 'Rate limited' };
    }

    // Reset flag if the timeout has passed
    if (justTcgRateLimited && Date.now() >= justTcgRateLimitReset) {
      justTcgRateLimited = false;
      console.log('✅ JustTCG rate limit reset - resuming requests');
    }

    // Check for API key first
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.log('⚠️  JUSTTCG_API_KEY not configured - cannot fetch from JustTCG');
      return { averagePrice: 'N/A', source: 'JustTCG', note: 'API key not configured' };
    }

    if (!cardNumber) {
      console.log('⚠️  JustTCG requires card number');
      return { averagePrice: 'N/A', source: 'JustTCG', note: 'Missing card number' };
    }

    console.log(`🔍 Searching JustTCG for: ${title} #${cardNumber} in ${set || 'any set'}`);

    // If set is unknown or not found, use a placeholder to trigger unrestricted search
    let justTcgSetId = null;
    if (set && set !== 'Unknown' && set !== 'Unknown Set') {
      justTcgSetId = await getJustTCGSetIdByName(set);
      if (!justTcgSetId) {
        console.log(`⚠️  Could not find JustTCG set matching "${set}", will try unrestricted search`);
      }
    } else {
      console.log(`⚠️  Set is unknown, will try unrestricted search`);
    }

    // Use a dummy set ID if we don't have one - findCardOnJustTCG will handle unrestricted search
    if (!justTcgSetId) {
      justTcgSetId = 'unknown-set-trigger-unrestricted-search';
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

    const nearMintVariant = cardResult.variants.find((v: any) => v.id.toLowerCase().includes('near-mint'));
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ JustTCG fetch error:', errorMsg);

    // Check if it's a rate limit error
    if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('REQUEST_LIMIT_EXCEEDED')) {
      justTcgRateLimited = true;
      justTcgRateLimitReset = Date.now() + (60 * 60 * 1000); // Reset in 1 hour
      console.log('🚫 JustTCG rate limited - disabling for 1 hour');
    }

    return { averagePrice: 'N/A', source: 'JustTCG' };
  }
}

// Find card on JustTCG
async function findCardOnJustTCG(cardQuery: string, justTcgSetId: string, tcgdexCardNumber: string) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.error('❌ JUSTTCG_API_KEY not configured');
      return null;
    }

    const cleanedCardName = extractCardName(cardQuery);

    console.log(`🔍 Searching JustTCG for: ${cleanedCardName} in set ID: ${justTcgSetId}, card #: ${tcgdexCardNumber}`);

    let results: any[] = [];

    // If set ID is unknown/dummy, skip straight to unrestricted search
    if (justTcgSetId === 'unknown-set-trigger-unrestricted-search') {
      console.log(`⚠️  Skipping set-specific search, going straight to unrestricted search`);
      // Skip to unrestricted search below
    } else {
      // First, try the provided set
      const searchUrl = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(cleanedCardName)}&game=pokemon&set=${justTcgSetId}`;
      console.log(`🔍 Searching main set: ${searchUrl}`);

      try {
        const searchResponse = await fetch(searchUrl, {
        headers: {
          'X-API-Key': JUSTTCG_API_KEY,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      
      // Check for rate limiting
      if (searchResponse.status === 429) {
        console.log(`⚠️ JustTCG API rate limited: ${searchResponse.status}`);
        const retryAfter = searchResponse.headers.get('Retry-After');
        const rateLimit = searchResponse.headers.get('X-RateLimit-Limit');
        const rateRemaining = searchResponse.headers.get('X-RateLimit-Remaining');
        console.log(`   Rate Limit Info - Remaining: ${rateRemaining}/${rateLimit}, Retry-After: ${retryAfter}`);
        results = []; // Return empty results to continue with fallbacks
      } else if (searchResponse.ok) {
        // Extract rate limit information if available
        const rateLimit = searchResponse.headers.get('X-RateLimit-Limit');
        const rateRemaining = searchResponse.headers.get('X-RateLimit-Remaining');
        if (rateLimit && rateRemaining) {
          console.log(`📊 JustTCG Rate Limit: ${rateRemaining}/${rateLimit} requests remaining`);
        }
        
        const searchResults = await searchResponse.json();
        results = Array.isArray(searchResults.data) ? searchResults.data : Array.isArray(searchResults) ? searchResults : [];
        console.log(`📊 Found ${results.length} results in main set`);
      } else {
        console.log(`⚠️ Main set search failed: ${searchResponse.status}`);
        // Check for access issues
        if (searchResponse.status === 402 || searchResponse.status === 403) {
          const rateLimit = searchResponse.headers.get('X-RateLimit-Limit');
          const rateRemaining = searchResponse.headers.get('X-RateLimit-Remaining');
          console.log(`⚠️ JustTCG API access issue: ${searchResponse.status}, Remaining: ${rateRemaining}/${rateLimit}`);
        }
      }
    } catch (err) {
      console.log(`⚠️  Main set search failed: ${(err as Error).message}, will try subsets`);
    }
    } // Close else block for set-specific search

    // If no results in main set, try related subsets (skip if using dummy set ID)
    if ((!results || results.length === 0) && justTcgSetId !== 'unknown-set-trigger-unrestricted-search') {
      console.log(`⚠️  No results in main set, attempting subset search...`);

      // Check if this is a set with known subsets (e.g., Crown Zenith)
      const relatedSubsets = await findRelatedSubsets(justTcgSetId);

      if (relatedSubsets && relatedSubsets.length > 0) {
        console.log(`🔄 Trying ${relatedSubsets.length} related subsets...`);

        for (const subsetId of relatedSubsets) {
          console.log(`🔍 Checking subset: ${subsetId}`);
          const subsetUrl = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(cleanedCardName)}&game=pokemon&set=${subsetId}`;

          try {
            const subsetResponse = await fetch(subsetUrl, {
              headers: {
                'X-API-Key': JUSTTCG_API_KEY,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
              }
            });

            if (subsetResponse.ok) {
              const subsetResults = await subsetResponse.json();
              const subsetData = Array.isArray(subsetResults.data) ? subsetResults.data : 
                                Array.isArray(subsetResults) ? subsetResults : [];

              if (subsetData && subsetData.length > 0) {
                console.log(`✅ Found ${subsetData.length} results in subset: ${subsetId}`);
                results = subsetData;
                break; // Found results, stop searching
              } else {
                console.log(`   No results in subset: ${subsetId}`);
              }
            } else {
              console.log(`   Subset ${subsetId} returned status: ${subsetResponse.status}`);
            }
          } catch (err) {
            console.log(`   Failed to check subset ${subsetId}: ${(err as Error).message}`);
          }
        }
      }

      // If still no results after checking subsets, also try searching without the set restriction
      if (!results || results.length === 0) {
        console.log(`⚠️  No results in main set or related subsets, trying search without set restriction...`);

        try {
          // Search without set restriction to find the card anywhere
          const unrestrictedUrl = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(cleanedCardName)}&game=pokemon`;
          console.log(`🔍 Unrestricted search: ${unrestrictedUrl}`);

          const unrestrictedResponse = await fetch(unrestrictedUrl, {
            headers: { 'X-API-Key': JUSTTCG_API_KEY }
          });

          if (unrestrictedResponse.ok) {
            const unrestrictedResults = await unrestrictedResponse.json();
            const unrestrictedData = Array.isArray(unrestrictedResults.data) ? unrestrictedResults.data : 
                                    Array.isArray(unrestrictedResults) ? unrestrictedResults : [];

            if (unrestrictedData && unrestrictedData.length > 0) {
              // Filter by card name more specifically
              const nameMatches = unrestrictedData.filter((card: any) =>
                card.name && card.name.toLowerCase().includes(cleanedCardName.toLowerCase())
              );

              // If we found name matches, use those
              if (nameMatches.length > 0) {
                console.log(`✅ Found ${nameMatches.length} name matches in unrestricted search`);
                results = nameMatches;
              } else {
                console.log(`⚠️  Unrestricted search found cards but no name matches: ${unrestrictedData.length} total`);
                // Use the original unrestricted results as a fallback
                results = unrestrictedData;
              }
            } else {
              console.log(`⚠️  Unrestricted search returned no results`);
            }
          } else {
            console.log(`⚠️  Unrestricted search returned status: ${unrestrictedResponse.status}`);
          }
        } catch (err) {
          console.log(`⚠️  Unrestricted search failed: ${(err as Error).message}`);
        }
      }

      // If still no results after all attempts, return null
      if (!results || results.length === 0) {
        console.log(`❌ No results found after trying main set, related subsets, and unrestricted search`);
        return null;
      }
    }

    console.log(`✅ Processing ${results.length} potential matches`);
    console.log(`🔍 Looking for card name: "${cleanedCardName}", card #: ${tcgdexCardNumber}`);

    let matchingCards: any[] = [];

    // PRIORITY 1: Match by full card name (case-insensitive exact match)
    matchingCards = results.filter((card: any) =>
      card.name && card.name.toLowerCase() === cleanedCardName.toLowerCase()
    );

    if (matchingCards.length > 0) {
      console.log(`✅ Found ${matchingCards.length} exact name match(es) for: "${cleanedCardName}"`);
    } else {
      // PRIORITY 2: Match by card name containing the search term
      matchingCards = results.filter((card: any) =>
        card.name && card.name.toLowerCase().includes(cleanedCardName.toLowerCase())
      );

      if (matchingCards.length > 0) {
        console.log(`✅ Found ${matchingCards.length} partial name match(es) for: "${cleanedCardName}"`);
      } else {
        // PRIORITY 3: Match by card number if we have it
        if (tcgdexCardNumber) {
          console.log(`🔍 No name matches, trying card number: ${tcgdexCardNumber}`);

          // Normalize card numbers for comparison (remove leading zeros, uppercase)
          const normalizeCardNumber = (num: string) => num.replace(/^0+/, '').toUpperCase();
          const targetCardNumber = normalizeCardNumber(tcgdexCardNumber);

          matchingCards = results.filter((card: any) => {
            if (!card.number) return false;

            // Try exact alphanumeric match first (for cards like GG44, TG30, etc.)
            const cardNumber = normalizeCardNumber(card.number.split('/')[0]); // Get number before slash if present
            if (cardNumber === targetCardNumber) {
              return true;
            }

            // Fall back to numeric-only matching for regular numbered cards
            if (/^\d+$/.test(targetCardNumber) && /^\d+/.test(cardNumber)) {
              const targetNum = parseInt(targetCardNumber, 10);
              const match = cardNumber.match(/^(\d+)/);
              if (match) {
                const itemNum = parseInt(match[1], 10);
                return itemNum === targetNum;
              }
            }

            return false;
          });

          if (matchingCards.length > 0) {
            console.log(`✅ Found ${matchingCards.length} card(s) matching number: ${targetCardNumber}`);
          }
        }
      }
    }

    if (matchingCards.length === 0) {
      console.log(`❌ No matches found for "${cleanedCardName}" #${tcgdexCardNumber}`);
      return null;
    }

    console.log(`✅ Using card: ${matchingCards[0].name} #${matchingCards[0].number} (${matchingCards[0].id})`);

    // --- Strict Near-Mint variantId selection only ---
    const selectedCard = matchingCards[0]; // pick the first match, no condition logic

    if (!Array.isArray(selectedCard.variants) || selectedCard.variants.length === 0) {
      console.log(`ℹ️ No variants array — cannot select 'near-mint' variant`);
      return null;
    }

    const nmVariant = selectedCard.variants.find(
      (v: any) => typeof v.id === 'string' && /near[-\s]?mint/i.test(v.id)
    );

    if (!nmVariant || !nmVariant.id) {
      console.log(`⚠️ No variant ID containing 'near-mint' found — trying to find first price variant`);

      // If no near-mint variant, try to find any variant with a price
      const firstPriceVariant = selectedCard.variants.find((v: any) => v.price && !isNaN(v.price));
      if (firstPriceVariant && firstPriceVariant.id) {
        console.log(`✅ Using first available variant with price: ${firstPriceVariant.id}`);
        (nmVariant as any) = firstPriceVariant;
      } else {
        console.log(`⚠️ No variants with price found`);
        return null;
      }
    }

    const variantId = (nmVariant as any).id;
    console.log(`✅ Using variant ID: ${variantId}`);

    console.log(`🔄 Fetching full details for variantId: ${variantId}`);
    const cardUrl = `https://api.justtcg.com/v1/cards?variantId=${variantId}`;
    const cardResponse = await fetch(cardUrl, {
      headers: {
        'X-API-Key': JUSTTCG_API_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    
    // Check for rate limiting
    if (cardResponse.status === 429) {
      console.log(`⚠️ JustTCG API rate limited in card details: ${cardResponse.status}`);
      const retryAfter = cardResponse.headers.get('Retry-After');
      const rateLimit = cardResponse.headers.get('X-RateLimit-Limit');
      const rateRemaining = cardResponse.headers.get('X-RateLimit-Remaining');
      console.log(`   Rate Limit Info - Remaining: ${rateRemaining}/${rateLimit}, Retry-After: ${retryAfter}`);
      return null; // Return null to trigger fallback
    }
    
    if (!cardResponse.ok) {
      console.log(`⚠️  Could not fetch card details from JustTCG (${cardResponse.status})`);
      // Check for access issues
      if (cardResponse.status === 402 || cardResponse.status === 403) {
        const rateLimit = cardResponse.headers.get('X-RateLimit-Limit');
        const rateRemaining = cardResponse.headers.get('X-RateLimit-Remaining');
        console.log(`⚠️ JustTCG API access issue: ${cardResponse.status}, Remaining: ${rateRemaining}/${rateLimit}`);
      }
      return null;
    }
    
    // Extract rate limit information if available
    const rateLimit = cardResponse.headers.get('X-RateLimit-Limit');
    const rateRemaining = cardResponse.headers.get('X-RateLimit-Remaining');
    if (rateLimit && rateRemaining) {
      console.log(`📊 JustTCG Rate Limit: ${rateRemaining}/${rateLimit} requests remaining (details)`);
    }

    const cardData = await cardResponse.json();
    const cardResult = (Array.isArray(cardData.data) && cardData.data[0]) || (Array.isArray(cardData) && cardData[0]);

    if (!cardResult) {
      console.log(`⚠️  No card data returned for variantId ${variantId}`);
      return null;
    }

    return cardResult;

  } catch (err) {
    console.error('❌ Error finding card on JustTCG:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Find related subsets for a given set
async function findRelatedSubsets(setId: string) {
  try {
    const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
    if (!JUSTTCG_API_KEY) {
      console.error('❌ JUSTTCG_API_KEY not configured');
      return [];
    }

    // Get all sets to look for related subsets
    const response = await fetch('https://api.justtcg.com/v1/sets?game=pokemon', {
      headers: { 'X-API-Key': JUSTTCG_API_KEY }
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch JustTCG sets: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const sets = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

    if (!sets || sets.length === 0) {
      return [];
    }

    // Find the original set
    const originalSet = sets.find((s: any) => s.id === setId);
    if (!originalSet || !originalSet.name) {
      return [];
    }

    const originalName = originalSet.name.toLowerCase();
    console.log(`🔍 Looking for subsets of: "${originalSet.name}" (ID: ${setId})`);

    // Extract base set name for matching (remove common suffixes like "pokemon", "tcg", etc.)
    let baseName = originalName
      .replace(/\s*-?\s*(pokemon|tcg|gallery|base|expansion|subset)\s*$/i, '')
      .trim();

    // Find all sets that are related as subsets
    const relatedSets = sets.filter((s: any) => {
      if (s.id === setId) return false; // Skip the original set
      if (!s.name) return false;

      const setName = s.name.toLowerCase();

      // Check if this set name starts with the original set name (like "Crown Zenith" matching "Crown Zenith Galarian Gallery")
      const isSubset = setName.startsWith(originalName) && setName !== originalName;

      // Also check if it matches the base name pattern
      const matchesBase = setName.includes(baseName) && setName !== baseName;

      return isSubset || matchesBase;
    });

    console.log(`   Found ${relatedSets.length} related subsets:`, relatedSets.map((s: any) => s.name));

    return relatedSets.map((s: any) => s.id);
  } catch (err) {
    console.error('❌ Error finding related subsets:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// Fetch Pokemon Price Tracker data for a card
async function fetchPokemonPriceTrackerData(title: string, cardNumber: string | null, set: string | null, language = 'en') {
  try {
    const POKEMONPRICETRACKER_API_KEY = process.env.POKEMONPRICETRACKER_API_KEY;
    if (!POKEMONPRICETRACKER_API_KEY) {
      console.log('⚠️  POKEMONPRICETRACKER_API_KEY not configured');
      return { averagePrice: 'N/A', source: 'Pokemon Price Tracker' };
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

    // Add additional headers that might be required to avoid 403 errors
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POKEMONPRICETRACKER_API_KEY}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.pokemonpricetracker.com/',
      }
    });

    if (!response.ok) {
      console.log(`⚠️  Pokemon Price Tracker API returned ${response.status}`);
      // Return different response for 403 errors specifically
      if (response.status === 403) {
        return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note: `Access forbidden - API key may be expired or invalid: ${response.status}` };
      }
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
      const exactMatch = data.data.find((card: any) => card.cardNumber === cardNumber);
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
    console.error('❌ Pokemon Price Tracker fetch error:', err);
    // Handle network errors and other exceptions
    return { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note: `Network error: ${err instanceof Error ? err instanceof Error ? err.message : String(err) : 'Unknown error'}` };
  }
}

// Fetch eBay data for a card
async function fetchEbayData(title: string, cardNumber: string | null, set: string | null) {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) {
      console.log('⚠️  RAPIDAPI_KEY not configured for eBay - cannot fetch from eBay');
      return { averagePrice: 'N/A', source: 'eBay', note: 'API key not configured' };
    }
    
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
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'ebay-average-selling-price.p.rapidapi.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ keywords: searchQuery, max_search_results: 240 })
    });

    if (!response.ok) {
      console.log(`⚠️  eBay API returned ${response.status}`);
      if (response.status === 403) {
        return { averagePrice: 'N/A', source: 'eBay', note: `Access forbidden - API key may be expired or invalid: ${response.status}` };
      } else if (response.status === 429) {
        return { averagePrice: 'N/A', source: 'eBay', note: `Rate limit exceeded: ${response.status}` };
      }
      return { averagePrice: 'N/A', source: 'eBay', note: `API error: ${response.status}` };
    }

    const apiData = await response.json();
    const items = apiData.products || apiData.items || [];
    console.log(`📊 eBay returned ${items.length} total items`);

    const cardName = extractCardName(title);
    const normalizeNum = (num: string) => num ? num.replace(/^0+/, '').toLowerCase() : '';
    const targetCardNum = cardNumber ? normalizeNum(cardNumber) : null;

    console.log(`🎯 Strict matching for:`);
    console.log(`   Card Name: "${cardName}"`);
    if (targetCardNum) console.log(`   Card #: ${targetCardNum}`);
    if (set && set !== 'Unknown' && set !== 'Unknown Set') console.log(`   Set: ${set}`);

    const gradingCompanies = ['psa', 'cgc', 'bgs', 'tag', 'ace'];
    const irrelevantTerms = ['lot', 'bundle', 'collection', 'booster', 'pack', 'box', 'sealed', 'case', 'complete set'];

    const relevantCards = items.filter((item: any, index: number) => {
      const itemTitle = (item.title || '').toLowerCase();
      console.log(`\n--- Filtering item ${index + 1}: "${item.title}" ---`);

      if (gradingCompanies.some((co: string) => itemTitle.includes(co)) || /\b(psa|cgc|bgs|tag|ace)\s+\d+/i.test(itemTitle)) {
        console.log('  Excluded: Graded card');
        return false;
      }

      if (irrelevantTerms.some((term: string) => itemTitle.includes(term))) {
        console.log('  Excluded: Irrelevant term (lot, sealed, etc.)');
        return false;
      }

      const cardNameLower = cardName.toLowerCase();
      const cardNameWords = cardNameLower.split(' ').filter((w: string) => w.length > 2);
      const allWordsPresent = cardNameWords.every((word: string) => itemTitle.includes(word));

      if (!allWordsPresent) {
        console.log(`  Excluded: Card name words not all present. Missing: ${cardNameWords.filter((word: string) => !itemTitle.includes(word)).join(', ')}`);
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
        const setWords = setLower.split(' ').filter((w: string) => w.length > 2);
        if (!itemTitle.includes(setLower)) {
          const setWordsPresent = setWords.filter((word: string) => itemTitle.includes(word));
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

    const recentSold = relevantCards.slice(0, 5).map((item: any) => ({
      title: (item.title || 'Unknown').replace(/Opens in a new window or tab/gi, '').trim(),
      sale_price: item.sale_price || item.currentPrice?.value || 0,
      condition: item.condition?.conditionDisplayName || 'Unknown',
      date_sold: item.date_sold || 'Unknown',
      link: item.link || '#'
    }));

    const allPrices = relevantCards.map((item: any) => item.sale_price || item.currentPrice?.value || 0).filter((p: number) => p > 0);
    const averagePrice = allPrices.reduce((sum: number, price: number) => sum + price, 0) / allPrices.length;

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
    return { averagePrice: 'N/A', source: 'eBay' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      query,
      set,
      rarity,
      type,
      language = 'en',
      includePricing = false,
      refresh = false,
      useJustTCGFallback = false, // JustTCG fallback disabled by default (main page only shows TCGdex cards)
    } = await request.json();

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

    // Check cache first
    const cacheKey = `search:${query}:${set}:${rarity}:${type}:${language}:${includePricing}`;
    const cachedData = cardDataCache.get(cacheKey);

    if (
      !refresh &&
      cachedData &&
      Date.now() - cachedData.timestamp < CARD_CACHE_DURATION
    ) {
      const age = Math.floor((Date.now() - cachedData.timestamp) / 1000 / 60);
      const nextRefresh = Math.floor(
        (CARD_CACHE_DURATION - (Date.now() - cachedData.timestamp)) / 1000 / 60
      );
      console.log(
        `✅ Returning cached search results (${cachedData.cards.length} cards, ${age} min old, refreshes in ${nextRefresh} min)`
      );
      return NextResponse.json(cachedData.cards);
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
        // TCGdex API supports name parameter for searching
        params.append('name', query.trim());
      }
      if (params.toString()) {
        searchUrl += `?${params.toString()}`;
      }
    }

    console.log(`📡 Fetching from TCGdex: ${searchUrl}`);

    const cards = await tcgdexQueue.add(async () => {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`TCGdex API error: ${response.status}`);
      }
      return await response.json();
    });

    console.log(`✅ Found ${cards.length} cards from API`);

    // Apply filters (only rarity and type, as name search is already done by API)
    let filteredCards = cards;
    if (rarity && rarity !== 'all') {
      filteredCards = filteredCards.filter(
        (card: any) =>
          card.rarity && card.rarity.toLowerCase().includes(rarity.toLowerCase())
      );
    }
    if (type && type !== 'all') {
      filteredCards = filteredCards.filter(
        (card: any) =>
          card.types &&
          card.types.some((t: string) => t.toLowerCase() === type.toLowerCase())
      );
    }

    // Limit results to 100 cards
    const limitedCards = filteredCards.slice(0, 100);

    let enhancedCards = limitedCards;

    // Only fetch pricing if explicitly requested
    if (includePricing) {
      console.log(`💰 Fetching pricing for ${limitedCards.length} cards...`);

      // Fetch full card details and enhance with pricing data using queue
      enhancedCards = await Promise.all(limitedCards.map(async (card: any, index: number) => {
          try {
              // Add minimal delay between pricing requests to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, index * 50));

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

              // Fetch multiple pricing sources
              const tcgPlayerData = await pricingQueue.add(() =>
                fetchTCGPlayerDataFromTCGAPI(
                  fullCard.name,
                  fullCard.id,
                  fullCard.localId,
                  setName,
                  language,
                  useJustTCGFallback
                )
              );

              // Fetch Pokemon Price Tracker data
              let pokemonPriceTrackerData: { averagePrice: string | number; source: string; [key: string]: any } = { averagePrice: 'N/A', source: 'Pokemon Price Tracker' };
              if (process.env.POKEMONPRICETRACKER_API_KEY) {
                pokemonPriceTrackerData = await pricingQueue.add(() =>
                  fetchPokemonPriceTrackerData(
                    fullCard.name,
                    fullCard.localId,
                    setName,
                    language
                  )
                );
              }

              // Fetch eBay data
              let ebayData: { averagePrice: string | number; source: string; [key: string]: any } = { averagePrice: 'N/A', source: 'eBay' };
              if (process.env.RAPIDAPI_KEY) {
                ebayData = await pricingQueue.add(() =>
                  fetchEbayData(
                    fullCard.name,
                    fullCard.localId,
                    setName
                  )
                );
              }

              return { 
                ...fullCard, 
                pricing: {
                  tcgPlayer: tcgPlayerData,
                  pokemonPriceTracker: pokemonPriceTrackerData,
                  ebay: ebayData
                }
              };
          } catch (err) {
              console.error(`Error processing card ${card.id}:`, err instanceof Error ? err.message : String(err));
              return { 
                ...card, 
                pricing: { 
                  tcgPlayer: { averagePrice: 'N/A', source: 'TCGplayer' },
                  pokemonPriceTracker: { averagePrice: 'N/A', source: 'Pokemon Price Tracker' },
                  ebay: { averagePrice: 'N/A', source: 'eBay' }
                } 
              };
          }
      }));
    } else {
      // Return cards without pricing data - much faster
      enhancedCards = limitedCards.map((card: any) => ({
        ...card,
        pricing: {
          tcgPlayer: { averagePrice: 'N/A', source: 'TCGplayer', note: 'Pricing not loaded' },
          pokemonPriceTracker: { averagePrice: 'N/A', source: 'Pokemon Price Tracker', note: 'Pricing not loaded' },
          ebay: { averagePrice: 'N/A', source: 'eBay', note: 'Pricing not loaded' }
        }
      }));
    }

    // Return all cards, regardless of pricing availability
    console.log(`📦 Returning ${enhancedCards.length} cards`);
    console.log(`${'='.repeat(50)}\n`);

    // Cache results (both with and without pricing)
    cardDataCache.set(cacheKey, {
      cards: enhancedCards,
      timestamp: Date.now()
    });
    console.log(`💾 Cached ${enhancedCards.length} cards - expires in 4 hours`);

    // Fetch exchange rate and convert prices to INR if includePricing is true
    if (includePricing) {
      // Define currency conversion functions here
      let currentExchangeRate = 88.72; // Default fallback rate
      
      // Fetch exchange rate from multiple sources
      const apis = [
        {
          name: 'ExchangeRate-API',
          url: 'https://open.er-api.com/v6/latest/USD',
          parse: (data: any) => data.rates?.INR
        },
        {
          name: 'ExchangeRate.host',
          url: 'https://api.exchangerate.host/latest?base=USD&symbols=INR',
          parse: (data: any) => data.rates?.INR
        },
        {
          name: 'Frankfurter',
          url: 'https://api.frankfurter.app/latest?from=USD&to=INR',
          parse: (data: any) => data.rates?.INR
        },
        {
          name: 'CurrencyAPI (Fawaz)',
          url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
          parse: (data: any) => data.usd?.inr
        }
      ];

      // Try each API until one succeeds
      for (const api of apis) {
        try {
          const response = await fetch(api.url);

          if (response.ok) {
            const data = await response.json();
            const rate = api.parse(data);

            if (rate && !isNaN(rate) && rate > 0) {
              currentExchangeRate = parseFloat(rate);
              break; // Success, exit the function
            }
          }
        } catch (err) {
          console.log(`   ❌ ${api.name} failed: ${(err as Error).message}`);
        }
      }

      // Convert USD price to INR
      function convertToINR(usdPrice: number | string): number | string {
        if (typeof usdPrice === 'string' && usdPrice.toLowerCase() === 'n/a') {
          return 'N/A';
        }
        return Number(usdPrice) * currentExchangeRate;
      }

      // Format INR price with ₹ symbol and commas
      function formatINR(inrPrice: number | string): string {
        if (inrPrice === 'N/A') {
          return 'N/A';
        }
        return `₹${Number(inrPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      }

      // Convert pricing data to INR
      function convertPricingToINR(pricing: any): any {
        if (!pricing) return pricing;
        
        const convertedPricing: any = { ...pricing };
        
        if (pricing.tcgPlayer) {
          // Create a copy of tcgPlayer to avoid modifying original
          const tcgPlayer = { ...pricing.tcgPlayer };
          
          // Convert main averagePrice if it's a number
          if (typeof tcgPlayer.averagePrice === 'number') {
            tcgPlayer.averagePrice = formatINR(convertToINR(tcgPlayer.averagePrice));
          }
          
          // Process variant pricing (holofoil, reverse-holofoil, normal, etc.)
          // Define the pricing variants to process (both camelCase and dash formats)
          const variants = [
            { original: 'holofoil', alternate: 'holofoil' },
            { original: 'reverse-holofoil', alternate: 'reverseHolofoil' },
            { original: 'normal', alternate: 'normal' }
          ];
          
          for (const variant of variants) {
            // Check for original format first, then alternate
            const variantKey = tcgPlayer[variant.original] ? variant.original : tcgPlayer[variant.alternate] ? variant.alternate : null;
            
            if (variantKey && tcgPlayer[variantKey]) {
              const variantData = { ...tcgPlayer[variantKey] };
              
              // Convert specific pricing fields
              const priceFields = ['lowPrice', 'midPrice', 'highPrice', 'marketPrice', 'directLowPrice'];
              
              for (const field of priceFields) {
                if (typeof variantData[field] === 'number') {
                  variantData[field] = formatINR(convertToINR(variantData[field]));
                }
              }
              
              tcgPlayer[variantKey] = variantData;
            }
          }
          
          convertedPricing.tcgPlayer = tcgPlayer;
        }
        
        if (pricing.cardmarket) {
          // Create a copy of cardmarket to avoid modifying original
          const cardmarket = { ...pricing.cardmarket };
          
          // Convert main averagePrice if it's a number
          if (typeof cardmarket.averagePrice === 'number') {
            cardmarket.averagePrice = formatINR(convertToINR(cardmarket.averagePrice));
          }
          
          // Process variant pricing (holofoil, reverse-holofoil, normal, etc.)
          // Define the pricing variants to process (both camelCase and dash formats)
          const variants = [
            { original: 'holofoil', alternate: 'holofoil' },
            { original: 'reverse-holofoil', alternate: 'reverseHolofoil' },
            { original: 'normal', alternate: 'normal' }
          ];
          
          for (const variant of variants) {
            // Check for original format first, then alternate
            const variantKey = cardmarket[variant.original] ? variant.original : cardmarket[variant.alternate] ? variant.alternate : null;
            
            if (variantKey && cardmarket[variantKey]) {
              const variantData = { ...cardmarket[variantKey] };
              
              // Convert specific pricing fields
              const priceFields = ['lowPrice', 'midPrice', 'highPrice', 'marketPrice', 'directLowPrice'];
              
              for (const field of priceFields) {
                if (typeof variantData[field] === 'number') {
                  variantData[field] = formatINR(convertToINR(variantData[field]));
                }
              }
              
              cardmarket[variantKey] = variantData;
            }
          }
          
          convertedPricing.cardmarket = cardmarket;
      }
      
      if (pricing.pokemonPriceTracker) {
          convertedPricing.pokemonPriceTracker = {
            ...pricing.pokemonPriceTracker,
            averagePrice: typeof pricing.pokemonPriceTracker.averagePrice === 'number' 
              ? formatINR(convertToINR(pricing.pokemonPriceTracker.averagePrice))
              : pricing.pokemonPriceTracker.averagePrice
          };
        }
        
        if (pricing.ebay) {
          convertedPricing.ebay = {
            ...pricing.ebay,
            averagePrice: typeof pricing.ebay.averagePrice === 'number' 
              ? formatINR(convertToINR(pricing.ebay.averagePrice))
              : pricing.ebay.averagePrice
          };
        }
        
        return convertedPricing;
      }
      
      // Apply conversion to all cards with pricing
      const convertedCards = enhancedCards.map((card: any) => {
        if (card.pricing) {
          return {
            ...card,
            pricing: convertPricingToINR(card.pricing)
          };
        }
        return card;
      });

      return NextResponse.json(convertedCards);
    } else {
      return NextResponse.json(enhancedCards);
    }
  } catch (err) {
    console.error('❌ Card search error:', err);
    return NextResponse.json(
      {
        error: 'Card search failed',
        details: err instanceof Error ? err instanceof Error ? err.message : String(err) : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

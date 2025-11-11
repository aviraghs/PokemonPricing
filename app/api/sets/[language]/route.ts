import { NextRequest, NextResponse } from 'next/server';

// Static map for release dates as a fallback
const releaseDateMap: Record<string, string> = {};

// Cache for multi-language sets
let tcgdexSetsCacheByLanguage: Record<string, any[]> = {};
let justTcgSetsCache: any[] | null = null;

// Fetch Japanese sets from Pokemon Price Tracker
async function fetchJapaneseSetsFromPPT() {
  try {
    const POKEMONPRICETRACKER_API_KEY = process.env.POKEMONPRICETRACKER_API_KEY;
    if (!POKEMONPRICETRACKER_API_KEY) {
      console.log('⚠️  POKEMONPRICETRACKER_API_KEY not configured');
      return null;
    }

    console.log('🇯🇵 Fetching Japanese sets from Pokemon Price Tracker...');

    const response = await fetch('https://www.pokemonpricetracker.com/api/v2/sets?language=japanese', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POKEMONPRICETRACKER_API_KEY}`,
      }
    });

    if (!response.ok) {
      console.log(`⚠️  Pokemon Price Tracker sets API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.data?.length || data.length || 0} Japanese sets from Pokemon Price Tracker`);

    return data.data || data;
  } catch (err) {
    console.error('❌ Error fetching Japanese sets from Pokemon Price Tracker:', (err as Error).message);
    return null;
  }
}

// Get TCGdex set ID by name
async function getTCGdexSetIdByName(setName: string, language = 'en') {
  if (!tcgdexSetsCacheByLanguage[language]) {
    console.log(`❄️ Initializing TCGdex sets cache for ${language}...`);
    const response = await fetch(`https://api.tcgdex.net/v2/${language}/sets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch TCGdex sets for ${language}`);
    }
    const allSets = await response.json();

    // Filter out Pocket sets
    tcgdexSetsCacheByLanguage[language] = allSets.filter((set: any) => {
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
    (s: any) => s.name.toLowerCase() === setName.toLowerCase()
  );
  return set ? set.id : null;
}

// Get JustTCG set ID by name
async function getJustTCGSetIdByName(setName: string) {
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

      console.log(`✅ JustTCG sets cache initialized with ${justTcgSetsCache?.length ?? 0} sets.`);
    } catch (err) {
      console.error('❌ Failed to load JustTCG sets cache:', (err as Error).message);
      justTcgSetsCache = [];
      return null;
    }
  }

  if (!justTcgSetsCache || justTcgSetsCache.length === 0) {
    return null;
  }

  // Clean the set name for comparison
  const cleanSetName = setName.replace(/['"]/g, '').trim();
  const setLower = cleanSetName.toLowerCase();

  // Try exact match first
  let set = justTcgSetsCache.find((s: any) => s.name && s.name.toLowerCase() === setLower);
  if (set) {
    console.log(`✅ Exact match found: "${set.name}" (ID: ${set.id})`);
    return set.id;
  }

  // Try partial match (for cases where names differ slightly)
  set = justTcgSetsCache.find((s: any) =>
    s.name && (s.name.toLowerCase().includes(setLower) || setLower.includes(s.name.toLowerCase()))
  );
  if (set) {
    console.log(`✅ Partial match found: "${set.name}" (ID: ${set.id})`);
    return set.id;
  }

  // If no direct match found, try to find subsets or related sets
  // For example: if "Crown Zenith" isn't found directly, look for "Crown Zenith Galarian Gallery"
  const setParts = setLower.split(/\s+/);
  if (setParts.length >= 1) {
    // Look for sets that start with or include the first part of the set name
    set = justTcgSetsCache.find((s: any) => {
      if (!s.name) return false;
      const nameLower = s.name.toLowerCase();
      return nameLower.includes(setParts[0]) &&
             (nameLower.includes('gallery') || nameLower.includes('subset') || nameLower.includes('extra') ||
              nameLower.includes('secret') || nameLower.includes('retrievers') || nameLower.includes('obscura') ||
              (nameLower.includes(setParts[0]) && nameLower.includes(setParts.slice(1).join(' '))));
    });

    if (set) {
      console.log(`✅ Subset match found: "${set.name}" (ID: ${set.id}) for original request: "${cleanSetName}"`);
      return set.id;
    }
  }

  // Final fallback: try to find a set that contains all the words from the original name
  // even if in a different order
  set = justTcgSetsCache.find((s: any) => {
    if (!s.name) return false;
    const nameWords = s.name.toLowerCase().split(/\s+/);
    const searchWords = setLower.split(/\s+/);

    return searchWords.every((word: string) =>
      nameWords.some((nameWord: string) => nameWord.includes(word) || word.includes(nameWord))
    );
  });

  if (set) {
    console.log(`✅ Fallback match found: "${set.name}" (ID: ${set.id}) for original request: "${cleanSetName}"`);
    return set.id;
  }

  console.log(`⚠️ No JustTCG set found matching: "${cleanSetName}"`);
  return null;
}

async function getJustTCGSetByName(setName: string) {
  // Ensure cache is populated by calling the other function
  await getJustTCGSetIdByName(setName);

  if (!justTcgSetsCache || justTcgSetsCache.length === 0) {
    return null;
  }

  // Try exact match first
  let set = justTcgSetsCache.find((s: any) => s.name && s.name.toLowerCase() === setName.toLowerCase());
  if (set) return set;

  // Try partial match (for cases where names differ slightly)
  const setLower = setName.toLowerCase();
  set = justTcgSetsCache.find((s: any) =>
    s.name && (s.name.toLowerCase().includes(setLower) || setLower.includes(s.name.toLowerCase()))
  );

  return set || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ language: string }> }
) {
  try {
    const { language: lang } = await params;
    const language = lang || 'en';
    const validLanguages = ['en', 'ja', 'ko', 'zh', 'fr', 'de', 'es', 'it', 'pt'];

    if (!validLanguages.includes(language)) {
      return NextResponse.json({ error: 'Invalid language code' }, { status: 400 });
    }

    // For Japanese sets, use Pokemon Price Tracker
    if (language === 'ja') {
      console.log('🇯🇵 Using Pokemon Price Tracker for Japanese sets...');
      const japaneseRawSets = await fetchJapaneseSetsFromPPT();

      if (!japaneseRawSets || japaneseRawSets.length === 0) {
        console.log('⚠️  Failed to fetch from Pokemon Price Tracker, falling back to TCGdex');
        // Fall through to TCGdex if Pokemon Price Tracker fails
      } else {
        // Log sample set to see field names
        if (japaneseRawSets.length > 0) {
          console.log(`   📊 Sample Japanese set fields:`, Object.keys(japaneseRawSets[0]));
          console.log(`   Sample set:`, japaneseRawSets[0]);
        }

        // Try to fetch logos from TCGdex for Japanese sets (tcgplayer-cdn blocks most requests)
        console.log(`   🔍 Attempting to fetch Japanese set logos from TCGdex as fallback...`);
        let tcgdexJapaneseSets = [];
        try {
          const tcgdexResponse = await fetch('https://api.tcgdex.net/v2/ja/sets');
          if (tcgdexResponse.ok) {
            tcgdexJapaneseSets = await tcgdexResponse.json();
            console.log(`   ✅ Fetched ${tcgdexJapaneseSets.length} Japanese sets from TCGdex for logo fallback`);
          }
        } catch (err) {
          console.log(`   ⚠️  Could not fetch TCGdex Japanese sets for logos: ${(err as Error).message}`);
        }

        // Transform Pokemon Price Tracker data to match TCGdex format
        // Use tcgPlayerId as the primary ID (this is the slug format like 'm2-inferno-x')
        const transformedSets = japaneseRawSets.map((set: any) => {
          let logoUrl = null;

          // Try to find matching TCGdex set by name to get logo
          if (tcgdexJapaneseSets.length > 0) {
            const tcgdexMatch = tcgdexJapaneseSets.find((tcgSet: any) =>
              tcgSet.name === set.name ||
              tcgSet.id === set.tcgPlayerId ||
              tcgSet.name.toLowerCase().includes(set.name.toLowerCase())
            );

            if (tcgdexMatch && tcgdexMatch.logo) {
              logoUrl = tcgdexMatch.logo;
              console.log(`   ✅ Found TCGdex logo for ${set.name}: ${logoUrl}`);
            } else {
              console.log(`   ⚠️  No TCGdex logo match for ${set.name}, using icon`);
            }
          }

          // Fallback: Don't use tcgplayer-cdn URLs since they're blocked
          // Just use null and let the frontend show the icon

          return {
            id: set.tcgPlayerId || set.slug || set.setId || set.id,  // Prefer tcgPlayerId for URL-friendly IDs
            name: set.name,
            logo: logoUrl, // null if no TCGdex match
            symbol: set.symbol || null,
            cardCount: {
              total: set.cardCount || set.total || set.numberOfCards || 0
            },
            releaseDate: set.releaseDate || set.release_date || set.releasedAt || null,
            englishName: set.englishName || set.english_name || null // Pokemon Price Tracker provides English names for Japanese sets
          };
        });

        // Log first few sets with their logo URLs
        console.log(`   🖼️  Logo URLs for first 3 sets:`);
        transformedSets.slice(0, 3).forEach((set: any) => {
          console.log(`      ${set.name}: ${set.logo || 'NO LOGO'}`);
        });

        console.log(`📦 Returning ${transformedSets.length} Japanese sets from Pokemon Price Tracker`);
        console.log(`   First set ID: ${transformedSets[0]?.id}, Name: ${transformedSets[0]?.name}`);
        return NextResponse.json(transformedSets, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        });
      }
    }

    // For all other languages (or Japanese fallback), use TCGdex
    const url = `https://api.tcgdex.net/v2/${language}/sets`;
    console.log(`🌐 Fetching ${language} sets from TCGdex: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter out TCG Pocket sets and keep only regular TCG sets
    const filteredData = data.filter((set: any) => {
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
    const enhancedData = await Promise.all(filteredData.map(async (set: any) => {
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
    // For non-English languages, dynamically translate set names using a translation service
    const detailedSets = await Promise.all(recentSets.map(async (set: any) => {
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
            let result = {
                ...set,
                ...detailedSetData, // This will add/overwrite with more accurate data like releaseDate
                logo: set.logo // Preserve the fixed logo from the initial fetch
            };

            return result;
        } catch (err) {
            console.error(`❌ Error fetching details for set ${set.id}:`, err);
            // On error, return original set data with fallback release date
            return {
                ...set,
                releaseDate: releaseDateMap[set.name] || null,
            };
        }
    }));

    console.log(`📦 Returning ${detailedSets.length} most recent sets with detailed data`);

    return NextResponse.json(detailedSets, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (err) {
    console.error('❌ Error fetching sets:', err);
    return NextResponse.json(
      { error: 'Failed to fetch sets' },
      { status: 500 }
    );
  }
}

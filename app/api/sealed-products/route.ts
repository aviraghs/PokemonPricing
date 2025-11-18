import { NextRequest, NextResponse } from 'next/server';
import sealedProductsData from '@/data/sealed-products.json';

const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
const cache = new Map<string, { products: any[]; timestamp: number }>();

// Currency conversion rate (USD to INR)
let currentExchangeRate = 88.72;

interface SealedProduct {
  id: string;
  name: string;
  productType: string;
  set: {
    id: string;
    name: string;
    series: string;
  };
  releaseDate: string;
  contents: string;
  image: string;
  category: string;
  searchTerms: string[];
  pricing?: {
    ebay?: {
      averagePrice: number | string;
      lowestPrice: number | string;
      listingCount: number;
      source: string;
    };
  };
}

// Fetch eBay data for a sealed product
async function fetchEbayData(productName: string): Promise<any> {
  try {
    const searchQuery = encodeURIComponent(`${productName} pokemon sealed`);
    const ebayUrl = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${process.env.EBAY_APP_ID}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${searchQuery}&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&itemFilter(1).name=Condition&itemFilter(1).value=New&sortOrder=PricePlusShippingLowest&paginationInput.entriesPerPage=20`;

    const response = await fetch(ebayUrl);

    if (!response.ok) {
      console.log(`⚠️ eBay API returned ${response.status} for ${productName}`);
      return null;
    }

    const data = await response.json();
    const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];

    if (!searchResult || searchResult['@count'] === '0') {
      return null;
    }

    const items = searchResult.item || [];

    if (items.length === 0) {
      return null;
    }

    // Calculate average and lowest price
    const prices = items
      .map((item: any) => {
        const sellingStatus = item.sellingStatus?.[0];
        const price = sellingStatus?.currentPrice?.[0]?.__value__;
        return price ? parseFloat(price) : null;
      })
      .filter((p: number | null) => p !== null && p > 0);

    if (prices.length === 0) {
      return null;
    }

    const averagePrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const lowestPrice = Math.min(...prices);

    return {
      averagePrice: (averagePrice * currentExchangeRate).toFixed(2),
      lowestPrice: (lowestPrice * currentExchangeRate).toFixed(2),
      listingCount: prices.length,
      source: 'eBay (Sold Listings)',
    };
  } catch (error) {
    console.error(`❌ Error fetching eBay data for ${productName}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    let query = '',
      set = '',
      language = 'en',
      includePricing = false,
      refresh = false;

    if (contentType?.includes('application/json')) {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 0) {
        const requestBody = await request.json();
        ({ query = '', set = '', language = 'en', includePricing = false, refresh = false } = requestBody);
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📦 SEALED PRODUCTS SEARCH REQUEST`);
    console.log(`Query: "${query || 'all'}"`);
    console.log(`Set: ${set || 'all'}`);
    console.log(`Language: ${language}`);
    console.log(`Include Pricing: ${includePricing}`);
    console.log(`Refresh: ${refresh}`);
    console.log(`${'='.repeat(50)}\n`);

    // Check cache
    const cacheKey = `sealed:${query}:${set}:${language}:${includePricing}`;
    const cachedData = cache.get(cacheKey);

    if (!refresh && cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      const age = Math.floor((Date.now() - cachedData.timestamp) / 1000 / 60);
      console.log(`✅ Returning cached sealed products (${cachedData.products.length} items, ${age} min old)`);
      return NextResponse.json(cachedData.products);
    }

    if (refresh) {
      console.log(`🔄 Refresh requested - bypassing cache`);
      cache.delete(cacheKey);
    }

    // Load sealed products from JSON
    let products: SealedProduct[] = [...sealedProductsData];

    console.log(`📋 Loaded ${products.length} sealed products from database`);

    // Apply filters
    let filteredProducts = products;

    // Filter by query
    if (query && query.trim() && query.toLowerCase() !== 'all') {
      const searchTerm = query.toLowerCase();
      filteredProducts = filteredProducts.filter((product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.productType.toLowerCase().includes(searchTerm) ||
        product.set.name.toLowerCase().includes(searchTerm) ||
        product.searchTerms.some((term) => term.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by set
    if (set && set !== 'all') {
      filteredProducts = filteredProducts.filter((product) => product.set.id === set);
    }

    console.log(`✅ Filtered to ${filteredProducts.length} sealed products`);

    // Fetch pricing from eBay if requested
    let enhancedProducts = filteredProducts;

    if (includePricing && process.env.EBAY_APP_ID) {
      console.log(`💰 Fetching eBay pricing for ${filteredProducts.length} products...`);

      enhancedProducts = await Promise.all(
        filteredProducts.map(async (product, index) => {
          try {
            // Add delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, index * 100));

            const ebayData = await fetchEbayData(product.name);

            return {
              ...product,
              pricing: {
                ebay: ebayData || {
                  averagePrice: 'N/A',
                  lowestPrice: 'N/A',
                  listingCount: 0,
                  source: 'eBay',
                },
              },
            };
          } catch (error) {
            console.error(`Error fetching pricing for ${product.name}:`, error);
            return {
              ...product,
              pricing: {
                ebay: {
                  averagePrice: 'N/A',
                  lowestPrice: 'N/A',
                  listingCount: 0,
                  source: 'eBay',
                },
              },
            };
          }
        })
      );

      console.log(`✅ Enhanced ${enhancedProducts.length} products with pricing`);
    }

    // Cache the results
    cache.set(cacheKey, {
      products: enhancedProducts,
      timestamp: Date.now(),
    });

    console.log(`📦 Returning ${enhancedProducts.length} sealed products\n`);
    return NextResponse.json(enhancedProducts);
  } catch (error) {
    console.error('❌ Error in sealed products API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sealed products', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

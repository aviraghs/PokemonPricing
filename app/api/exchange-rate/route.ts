import { NextRequest, NextResponse } from 'next/server';

let currentExchangeRate = 88.72; // Default fallback rate
let lastExchangeRateFetch: Date | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fetch latest USD to INR exchange rate from multiple sources
async function fetchExchangeRate(): Promise<number> {
  console.log('ConverterFactory Fetching latest USD to INR exchange rate...');

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
        lastExchangeRateFetch = new Date();
        console.log(`✅ Exchange rate updated from ${api.name}: 1 USD = ₹${currentExchangeRate.toFixed(6)} INR`);
        console.log(`   Last updated: ${lastExchangeRateFetch.toLocaleString()}`);
        return currentExchangeRate; // Success, exit the function
      } else {
        console.log(`   ⚠️  ${api.name} returned invalid data`);
      }
    } catch (err) {
      console.log(`   ❌ ${api.name} failed: ${(err as Error).message}`);
    }
  }

  // If all APIs failed
  console.error('❌ All exchange rate APIs failed');
  console.log(`⚠️  Using fallback rate: 1 USD = ₹${currentExchangeRate} INR`);
  return currentExchangeRate;
}

export async function GET(request: NextRequest) {
  try {
    // Check if we need to refresh
    if (
      !lastExchangeRateFetch ||
      Date.now() - lastExchangeRateFetch.getTime() > CACHE_DURATION
    ) {
      await fetchExchangeRate();
      lastExchangeRateFetch = new Date();
    }

    return NextResponse.json({
      rate: currentExchangeRate,
      lastUpdated: lastExchangeRateFetch,
      from: 'USD',
      to: 'INR',
    });
  } catch (err) {
    console.error('❌ Error fetching exchange rate:', err);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}

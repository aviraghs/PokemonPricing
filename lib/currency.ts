// Currency conversion utilities
let currentExchangeRate = 88.72; // Default fallback rate
let lastExchangeRateUpdate: Date | null = null;
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fetch latest USD to INR exchange rate
export async function fetchExchangeRate(): Promise<number> {
  console.log('💱 Fetching latest USD to INR exchange rate...');

  const apis = [
    {
      name: 'ExchangeRate-API',
      url: 'https://open.er-api.com/v6/latest/USD',
      parse: (data: any) => data.rates?.INR,
    },
    {
      name: 'ExchangeRate.host',
      url: 'https://api.exchangerate.host/latest?base=USD&symbols=INR',
      parse: (data: any) => data.rates?.INR,
    },
    {
      name: 'Frankfurter',
      url: 'https://api.frankfurter.app/latest?from=USD&to=INR',
      parse: (data: any) => data.rates?.INR,
    },
  ];

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
        return currentExchangeRate;
      }
    } catch (err) {
      console.log(`   ❌ ${api.name} failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  console.error('❌ All exchange rate APIs failed');
  console.log(`⚠️  Using fallback rate: 1 USD = ₹${currentExchangeRate} INR`);
  return currentExchangeRate;
}

export function getExchangeRate(): number {
  return currentExchangeRate;
}

export function convertToINR(usdPrice: number | string): number | string {
  if (typeof usdPrice === 'string' && usdPrice.toLowerCase() === 'n/a') {
    return 'N/A';
  }
  return Number(usdPrice) * currentExchangeRate;
}

export function formatINR(inrPrice: number | string): string {
  if (inrPrice === 'N/A') {
    return 'N/A';
  }
  return `₹${Number(inrPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

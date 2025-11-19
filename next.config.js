/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable instrumentation for environment validation on startup
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.tcgdex.net',
      },
      {
        protocol: 'https',
        hostname: 'tcgplayer-cdn.tcgplayer.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
      {
        protocol: 'https',
        hostname: 'pokefetch.info',
      },
    ],
  },
};

module.exports = nextConfig;

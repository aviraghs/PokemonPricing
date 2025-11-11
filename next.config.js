/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
  // Add allowedDevOrigins for development
  experimental: {
    allowedDevOrigins: [
      'https://236c0b5c-307a-4b34-ba19-266ef4eac30a-00-3w585d9y9499c.sisko.replit.dev',
      /.*\.replit\.dev$/,
      /.*\.repl\.co$/,
    ],
  },
};

module.exports = nextConfig;

import type { Metadata } from 'next';
import { Poppins, Orbitron } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import CyberGrid from '@/components/CyberGrid';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

const orbitron = Orbitron({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-orbitron',
});

export const metadata: Metadata = {
  title: 'Pokécard Pro - Track, Value & Collect',
  description: 'Track, value, and manage your Pokémon card collection',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.tcgdex.net" />
        <link rel="dns-prefetch" href="https://api.tcgdex.net" />
        <link rel="dns-prefetch" href="https://open.er-api.com" />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${poppins.variable} ${orbitron.variable}`}>
        <CyberGrid />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

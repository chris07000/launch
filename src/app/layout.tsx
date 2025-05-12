import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Press_Start_2P } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const pixelFont = Press_Start_2P({ 
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bitcoin Tiger Ordinals - Mint Exclusive Bitcoin Digital Collectibles',
  description: 'Bitcoin Tiger Ordinals is a premier Bitcoin-native collection. Mint your exclusive digital collectibles inscribed directly on the Bitcoin blockchain.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={pixelFont.className}>
        {children}
      </body>
    </html>
  );
} 
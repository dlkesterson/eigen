import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { Providers } from '@/components/providers';
import { CommandMenu } from '@/components/command-menu';
import './globals.css';

// Load fonts with Next.js font optimization for consistent cross-platform rendering
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

// SUSE display font - loaded locally for cross-platform consistency
// Variable font supports weights 400-800
const suse = localFont({
  src: [
    {
      path: '../../public/fonts/SUSE-latin.woff2',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-display',
  weight: '400 800', // Variable font weight range
});

export const metadata: Metadata = {
  title: 'Eigen - Modern Syncthing Manager',
  description: 'A beautiful, modern Syncthing manager built with Tauri and Next.js',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${jetbrainsMono.variable} ${suse.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background font-sans antialiased">
        <Providers>
          {children}
          <CommandMenu />
          <div className="bg-noise" />
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { LayoutWrapper } from '@/components/layout-wrapper';

import { CommandPalette } from '@/components/command-palette';
import { SearchModal } from '@/components/search-modal';

export const metadata: Metadata = {
  title: 'Rabbit',
  description: 'Advanced ZIP file management system with AI-powered features',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/rabbit.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
    apple: '/rabbit.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico?v=2024" sizes="32x32" />
        <link rel="icon" href="/rabbit.ico?v=2024" sizes="32x32" />
        <link rel="shortcut icon" href="/favicon.ico?v=2024" />
        <link rel="apple-touch-icon" href="/rabbit.png" />
        <meta name="msapplication-TileImage" content="/rabbit.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <CommandPalette />
          <SearchModal />
        </AuthProvider>
      </body>
    </html>
  );
}

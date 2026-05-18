import type { Metadata, Viewport } from 'next';
import { MetaPixel } from '../components/meta-pixel';
import { TikTokPixel } from '../components/tiktok-pixel';
import './globals.css';

export const metadata: Metadata = {
  title: 'Someday',
  description: 'See realistic future memories of you and your friends.',
  icons: {
    icon: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MetaPixel />
        <TikTokPixel />
        {children}
      </body>
    </html>
  );
}

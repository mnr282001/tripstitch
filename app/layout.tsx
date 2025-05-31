import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'TripStitch - Collaborative Trip Planning',
  description: 'Stitch your travel plans together with friends and family',
  
  // Your current icons are fine
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  
  // Add these for better performance:
  metadataBase: new URL('https://tripstitch.io'),
  
  // Preconnect to external domains you use
  other: {
    'dns-prefetch': '//fonts.googleapis.com',
    'preconnect': 'https://fonts.gstatic.com',
  },
  
  // OpenGraph for better social sharing (auto-handled by opengraph-image.tsx)
  openGraph: {
    title: 'TripStitch - Collaborative Trip Planning',
    description: 'Stitch your travel plans together with friends and family',
    type: 'website',
    locale: 'en_US',
  },
  
  // Twitter cards
  twitter: {
    card: 'summary_large_image',
    title: 'TripStitch - Collaborative Trip Planning',
    description: 'Stitch your travel plans together with friends and family',
  },
  
  // Performance hints
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  fallback: ['system-ui', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  fallback: ['monospace'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'CWPC BAD Electronic Grading System',
    template: '%s | CWPC BAD Electronic Grading System',
  },
  description: 'Professional electronic grading system for CWPC BAD - Streamlined assessment, automated reporting, and comprehensive analytics.',
  keywords: [
    'electronic grading',
    'assessment system',
    'CWPC BAD',
    'education technology',
    'automated grading',
    'academic evaluation',
  ],
  authors: [{ name: 'CWPC BAD Team' }],
  creator: 'CWPC BAD Team',
  publisher: 'CWPC BAD',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'CWPC BAD Electronic Grading System',
    title: 'CWPC BAD Electronic Grading System',
    description: 'Professional electronic grading system for CWPC BAD - Streamlined assessment, automated reporting, and comprehensive analytics.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CWPC BAD Electronic Grading System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CWPC BAD Electronic Grading System',
    description: 'Professional electronic grading system for CWPC BAD - Streamlined assessment, automated reporting, and comprehensive analytics.',
    images: ['/og-image.png'],
    creator: '@cwpcbad',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  // Design-Taste meta tags for software/site-kind
  other: {
    'data-type': 'software',
    'site-kind': 'software',
    'page-type': 'software',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        data-type="software"
        site-kind="software"
        page-type="software"
      >
        {children}
      </body>
    </html>
  );
}
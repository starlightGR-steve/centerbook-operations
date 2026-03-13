import type { Metadata, Viewport } from 'next';
import AuthProvider from '@/components/AuthProvider';
import { MockDataProvider } from '@/context/MockDataContext';
import { SessionAdjustProvider } from '@/context/SessionAdjustContext';
import Shell from '@/components/layout/Shell';
import '@/styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'The Center Book Operations',
  description: 'In-center operations app for Kumon educational centers',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'The Center Book',
  },
  other: {
    'theme-color': '#355caa',
  },
  icons: {
    apple: '/images/the_center_book_logo_sq.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <MockDataProvider>
            <SessionAdjustProvider>
              <a href="#main-content" className="skip-link">Skip to main content</a>
              <Shell>{children}</Shell>
            </SessionAdjustProvider>
          </MockDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

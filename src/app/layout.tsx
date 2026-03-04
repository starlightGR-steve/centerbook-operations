import type { Metadata } from 'next';
import Shell from '@/components/layout/Shell';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CenterBook Operations',
  description: 'In-center operations app for Kumon educational centers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { LyticsProvider } from '@/components/LyticsProvider';
import { PersonalizationBanner } from '@/components/PersonalizationBanner';
import { FloatingHelpWidget } from '@/components/FloatingHelpWidget';

export const metadata: Metadata = {
  title: 'Support Portal | Your Help Center',
  description: 'Get help, browse documentation, and submit support tickets. Powered by intelligent personalization.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <LyticsProvider>
          <PersonalizationBanner />
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingHelpWidget />
        </LyticsProvider>
      </body>
    </html>
  );
}


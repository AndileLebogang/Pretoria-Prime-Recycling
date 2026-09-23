import './globals.css';
import { display, body } from './fonts';
import { site } from '@/lib/site';

export const metadata = {
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.slogan,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Prime Recycling', statusBarStyle: 'default' },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#2a7040' };

export default function RootLayout({ children }) {
  return (
    <html lang="en-ZA" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

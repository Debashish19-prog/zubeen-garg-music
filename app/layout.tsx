import type { Metadata, Viewport } from 'next';
import { Anek_Bangla, Figtree } from 'next/font/google';
import AppShell from '@/components/shell/AppShell';
import { navData } from '@/lib/server/catalog';
import './globals.css';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap', weight: ['400', '500', '600', '700', '800', '900'] });
const anek = Anek_Bangla({ subsets: ['bengali', 'latin'], variable: '--font-anek', display: 'swap', weight: ['500', '700', '800'] });

export const metadata: Metadata = {
  title: { default: 'Zubeen · every song, one player', template: '%s · Zubeen' },
  description: 'A fan-made music player for the songs of Zubeen Garg (1972–2025): thousands of songs in dozens of languages, playing through official players.',
  applicationName: 'Zubeen',
  appleWebApp: { capable: true, title: 'Zubeen', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${anek.variable}`}>
      <head>
        {/* YouTube refuses most label uploads on pages served from an IP address (error 150), so 127.0.0.1 -> localhost */}
        <script dangerouslySetInnerHTML={{ __html: "if(/^(127\\.0\\.0\\.1|\\[::1\\]|0\\.0\\.0\\.0)$/.test(location.hostname))location.replace(location.href.replace(location.hostname,'localhost'))" }} />
      </head>
      <body>
        <AppShell nav={navData()}>{children}</AppShell>
      </body>
    </html>
  );
}

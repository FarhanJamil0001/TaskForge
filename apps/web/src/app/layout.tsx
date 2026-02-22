import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskForge',
  description: 'Project management with Discord integration',
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

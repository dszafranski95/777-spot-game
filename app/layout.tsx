// app/layout.tsx
// app/layout.tsx
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'TOR 777 SPIN',
  description: 'Slot machine game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

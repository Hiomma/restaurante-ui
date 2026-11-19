import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import Providers from './Providers';

// Identidade visual SIETIMA: Montserrat é a fonte do logotipo (Bold/ExtraBold)
// e do slogan (SemiBold) segundo o manual de identidade.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sietima — Gestão precisa do estoque ao prato',
  description: 'A gestão inteligente da sua cozinha profissional',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

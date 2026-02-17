import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ColorThemeProvider } from '@/components/providers/ColorThemeProvider';
import { LocaleProvider } from '@/components/providers/LocaleProvider';

export const metadata: Metadata = {
  title: 'SecretReels',
  description: 'Uncover secrets, share truths.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <ColorThemeProvider>
            <LocaleProvider>
              <AuthProvider>
              <FirebaseErrorListener />
              {children}
              <Toaster />
              </AuthProvider>
            </LocaleProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

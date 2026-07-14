import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import ThemeProvider from "./_components/ThemeProvider";
import I18nProvider from "./_components/I18nProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "mc-pixel app",
  description: "Convert any image into pixel-perfect block art. Generate block-accurate schematics from any photo.",
};

const antiFlashScript = `(function(){var p=localStorage.getItem('theme-preference')||'light';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

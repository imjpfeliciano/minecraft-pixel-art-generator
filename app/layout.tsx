import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import ThemeProvider from "./_components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minecraft Pixel Art Generator",
  description: "Convert any image into a Minecraft pixel art Litematica schematic",
};

const antiFlashScript = `(function(){var p=localStorage.getItem('theme-preference')||'light';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

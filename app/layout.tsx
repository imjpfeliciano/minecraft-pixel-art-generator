import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next"
import ThemeProvider from "./_components/ThemeProvider";
import I18nProvider from "./_components/I18nProvider";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mc-pixel.app";

const OG_TITLE = "mc-pixel — Free Minecraft Pixel Art Generator";
const OG_DESCRIPTION =
  "Convert any photo into pixel-perfect Minecraft block art. Auto-generate block-accurate Litematica schematics. Free, browser-based, no account required.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "mc-pixel | Minecraft Pixel Art Generator",
    template: "%s | mc-pixel",
  },
  description: OG_DESCRIPTION,
  keywords: [
    "minecraft pixel art generator",
    "image to minecraft blocks",
    "litematica schematic generator",
    "minecraft schematic from image",
    "convert photo to minecraft pixel art",
    "minecraft pixel art maker online free",
    "minecraft block art creator",
    "litematica pixel art tool",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "mc-pixel",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: OG_TITLE }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themePref = cookieStore.get("theme-preference")?.value ?? "light";
  const isDark =
    themePref === "dark" ||
    (themePref === "system" &&
      // system preference can't be read server-side; default to light
      false);
  return (
    <html lang="en" className={`antialiased${isDark ? " dark" : ""}`} suppressHydrationWarning>
      <head />
      <body>
        <ClerkProvider afterSignOutUrl="/">
          <ThemeProvider>
          <I18nProvider>
          {children}
          </I18nProvider>
          </ThemeProvider>
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
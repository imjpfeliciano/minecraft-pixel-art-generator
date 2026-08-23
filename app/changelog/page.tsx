import type { Metadata } from "next";
import NavBar from "../_components/NavBar";
import Footer from "../_components/landing/Footer";
import ChangelogContent from "./ChangelogContent";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mc-pixel.app";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What is new in mc-pixel: community gallery, user accounts, saved creations, and the original image-to-schematic generator.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Changelog | mc-pixel",
    description: "Feature updates for the Minecraft pixel art generator.",
    url: `${SITE_URL}/changelog`,
  },
  twitter: {
    title: "Changelog | mc-pixel",
    description: "Feature updates for the Minecraft pixel art generator.",
  },
};

export default function ChangelogPage() {
  return (
    <div className="min-w-[1280px] bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <NavBar />
      <ChangelogContent />
      <Footer />
    </div>
  );
}

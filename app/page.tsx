import NavBar from "./_components/NavBar";
import HeroSection from "./_components/landing/HeroSection";
import HowItWorksSection from "./_components/landing/HowItWorksSection";
import CatalogueSection from "./_components/landing/CatalogueSection";
import TagsSection from "./_components/landing/TagsSection";
import Footer from "./_components/landing/Footer";
import { getDb } from "./_lib/server/firebase-admin";
import { toCreationJson, type Creation } from "./_lib/creation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mc-pixel.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "mc-pixel",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Convert any image into pixel-perfect Minecraft block art. Auto-generate block-accurate Litematica schematics. Free, browser-based, no account required.",
  url: SITE_URL,
};

async function fetchRecentPublicCreations() {
  try {
    const db = getDb();
    const snap = await db
      .collection("creations")
      .where("visibility", "==", "public")
      .orderBy("publishedAt", "desc")
      .limit(6)
      .get();
    return snap.docs.map((d) => toCreationJson({ id: d.id, ...d.data() } as Creation));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("index") && !msg.includes("FAILED_PRECONDITION")) {
      console.error("[landing] fetchRecentPublicCreations error:", err);
    }
    return [];
  }
}

export default async function LandingPage() {
  const recentCreations = await fetchRecentPublicCreations();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-w-[1280px] bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <NavBar />
        <main>
          <HeroSection />
          <HowItWorksSection />
          <CatalogueSection creations={recentCreations} />
          <TagsSection />
        </main>
        <Footer />
      </div>
    </>
  );
}

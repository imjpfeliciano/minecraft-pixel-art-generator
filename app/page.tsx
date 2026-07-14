import NavBar from "./_components/NavBar";
import HeroSection from "./_components/landing/HeroSection";
import HowItWorksSection from "./_components/landing/HowItWorksSection";
import CatalogueSection from "./_components/landing/CatalogueSection";
import TagsSection from "./_components/landing/TagsSection";
import Footer from "./_components/landing/Footer";

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

export default function LandingPage() {
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
          <CatalogueSection />
          <TagsSection />
        </main>
        <Footer />
      </div>
    </>
  );
}

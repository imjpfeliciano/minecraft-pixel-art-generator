import NavBar from "./_components/NavBar";
import HeroSection from "./_components/landing/HeroSection";
import HowItWorksSection from "./_components/landing/HowItWorksSection";
import CatalogueSection from "./_components/landing/CatalogueSection";
import TagsSection from "./_components/landing/TagsSection";
import Footer from "./_components/landing/Footer";

export default function LandingPage() {
  return (
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
  );
}

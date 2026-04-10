import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProofBar from "@/components/SocialProofBar";
import Features from "@/components/Features";
import FeatureCarousel from "@/components/FeatureCarousel";
import HowItWorks from "@/components/HowItWorks";
import WhoThisIsFor from "@/components/WhoThisIsFor";
import Pricing from "@/components/Pricing";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
const Index = () => {
  return <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        
        <Features />
        <FeatureCarousel />
        <HowItWorks />
        <WhoThisIsFor />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>;
};
export default Index;
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingSection from "@/components/Pricing";

const Pricing = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <PricingSection showROICalculator />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
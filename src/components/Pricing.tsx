import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import ROICalculator from "./ROICalculator";
const pricingTiers = [{
  name: "Starter",
  monthlyPrice: 0,
  annualPrice: 0,
  description: "Perfect for small preschools getting started",
  features: ["Up to 10 students", "Basic document uploads", "Email notifications", "Secure cloud storage", "Community support"],
  cta: "Start Free Trial",
  trialNote: "1-month free trial",
  highlighted: false,
  link: "/school-register"
}, {
  name: "Pro",
  monthlyPrice: 79,
  annualPrice: 790,
  // Save ~2 months
  description: "For growing schools and daycares",
  features: ["Up to 150 students", "Unlimited document uploads", "Expiration tracking", "Teacher compliance", "Required document builder", "Priority support", "Advanced reporting", "API access"],
  cta: "Start Free Trial",
  trialNote: "1 month free trial",
  highlighted: true,
  link: "/school-register"
}, {
  name: "Enterprise",
  monthlyPrice: null,
  annualPrice: null,
  description: "For multi-campus organizations",
  features: ["Unlimited students", "Multi-campus support", "Custom templates", "Advanced security", "Dedicated support", "Custom integrations", "Training & onboarding", "99.9% uptime SLA"],
  cta: "Apply Now",
  trialNote: null,
  highlighted: false,
  link: "/institution-auth"
}];
interface PricingProps {
  showROICalculator?: boolean;
}

const Pricing = ({ showROICalculator = false }: PricingProps) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const getPrice = (tier: typeof pricingTiers[0]) => {
    if (tier.monthlyPrice === null) return "Custom";
    if (tier.monthlyPrice === 0) return "Free";
    if (isAnnual) {
      return `$${Math.round(tier.annualPrice! / 12)}`;
    }
    return `$${tier.monthlyPrice}`;
  };
  const getPeriod = (tier: typeof pricingTiers[0]) => {
    if (tier.monthlyPrice === null || tier.monthlyPrice === 0) return null;
    return "per month";
  };
  const getAnnualSavings = (tier: typeof pricingTiers[0]) => {
    if (!isAnnual || tier.monthlyPrice === null || tier.monthlyPrice === 0) return null;
    const monthlyCost = tier.monthlyPrice * 12;
    const savings = monthlyCost - tier.annualPrice!;
    return savings;
  };
  return <section className="py-24 bg-background">
      <div className="container px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            Choose the plan that fits your school. All paid plans include a free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-muted/50 p-1.5 rounded-full">
            <button onClick={() => setIsAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!isAnnual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Monthly
            </button>
            <button onClick={() => setIsAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${isAnnual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Annual
              <span className="ml-2 text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto px-4">
          {pricingTiers.map((tier, index) => {
          const savings = getAnnualSavings(tier);
          return <Card key={index} className={`relative transition-all duration-300 hover:shadow-xl bg-card ${tier.highlighted ? "border-secondary border-2 shadow-lg md:scale-105 mt-6 md:mt-0" : "border-border"}`}>
                {tier.highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-secondary rounded-full shadow-sm whitespace-nowrap">
                    <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Most Popular
                    </span>
                  </div>}
                
                <CardHeader className={`text-center pb-4 ${tier.highlighted ? 'pt-10' : 'pt-8'}`}>
                  <CardTitle className="text-2xl font-serif mb-2 text-foreground">{tier.name}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {tier.description}
                  </CardDescription>
                  <div className="mt-4">
                    
                    {getPeriod(tier) && <span className="text-muted-foreground ml-2">/{getPeriod(tier)}</span>}
                  </div>
                  {isAnnual && savings && <p className="text-sm text-primary font-medium mt-2">
                      Save ${savings}/year
                    </p>}
                  {isAnnual && tier.annualPrice && tier.annualPrice > 0 && <p className="text-xs text-muted-foreground mt-1">
                      Billed annually at ${tier.annualPrice}
                    </p>}
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>)}
                  </ul>

                  <div className="space-y-2">
                    <Button asChild variant={tier.highlighted ? "accent" : "default"} className="w-full font-semibold h-12" size="lg">
                      <Link to={tier.link}>
                        {tier.cta}
                      </Link>
                    </Button>
                    {tier.trialNote && <p className="text-xs text-center text-muted-foreground">
                        {tier.trialNote}
                      </p>}
                  </div>
                </CardContent>
              </Card>;
        })}
        </div>

        <div className="mt-16 text-center space-y-2">
          <p className="text-sm text-muted-foreground"> Simple monthly pricing per campus • Cancel anytime  ​</p>
          <p className="text-sm font-semibold text-foreground">
            HIPAA Compliant • 256-Bit Encryption • NYC DOH Approved
          </p>
        </div>
      </div>

      {showROICalculator && <ROICalculator />}
    </section>;
};
export default Pricing;
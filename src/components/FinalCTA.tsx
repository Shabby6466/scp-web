import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Ready to simplify compliance?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join 50+ NYC preschools already using SCP to stay DOH-ready
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button
              size="lg"
              className="px-8 py-6 text-base font-semibold"
              onClick={() => navigate("/auth?tab=register")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-6 text-base font-semibold"
              onClick={() => navigate("/institution-auth")}
            >
              <Phone className="mr-2 h-5 w-5" />
              Talk to Sales
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required • 30-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;

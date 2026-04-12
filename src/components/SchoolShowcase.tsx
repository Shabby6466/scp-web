import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SchoolShowcase = () => {
  const navigate = useNavigate();
  const benefits = [
    "Streamline student documentation and compliance",
    "Reduce administrative burden by 70%",
    "Secure, HIPAA-compliant document storage",
    "Instant parent access to all records",
    "Automated expiration tracking and alerts",
    "Digital consent forms and signatures",
    "Real-time document status updates",
    "Centralized communication with families"
  ];

  return (
    <section className="py-24 bg-muted">
      <div className="container px-4">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-primary/15 border border-primary/30 rounded-full mb-6">
            <span className="text-sm font-semibold text-primary tracking-wide">FOR EDUCATIONAL INSTITUTIONS</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
            Register Your Institution
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join forward-thinking schools that are transforming their document management. Save time, space and stay compliant to focus on what matters most.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto border border-border shadow-xl">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mb-6">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-3xl font-serif font-bold mb-4 text-foreground">
                  Why Schools Choose SCP
                </h3>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Designed specifically for preschools and early childhood education centers, SCP eliminates paperwork chaos and ensures compliance with ease.
                </p>
                <Button
                  size="lg"
                  className="w-full md:w-auto font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => navigate('/school-register')}
                >
                  Start Registration
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-12">
          <p className="text-lg font-semibold text-foreground mb-2">
            Questions about getting started?
          </p>
          <p className="text-base text-muted-foreground">
            Contact our team to learn how SCP can transform your school's operations
          </p>
        </div>
      </div>
    </section>
  );
};

export default SchoolShowcase;

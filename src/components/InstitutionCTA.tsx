import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
const InstitutionCTA = () => {
  return <section className="py-20 bg-muted">
      <div className="container px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="border border-border shadow-xl bg-card">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 text-primary font-semibold text-sm">
                    <Building2 className="h-4 w-4" />
                    For Institutions
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                      Register Your Institution
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Join hundreds of preschools and daycare facilities streamlining their documentation process with PreSchool Portal.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm">Reduce administrative workload by up to 70%</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm">Ensure compliance with automated tracking</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm">Improve parent communication and satisfaction</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg font-semibold">
                      <Link to="/institution-auth" className="flex items-center gap-2">Apply<ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" className="bg-brandred text-white hover:bg-brandred/90 shadow-lg font-semibold">
                      <Link to="/pricing">
                        View Pricing
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="aspect-square rounded-2xl bg-primary/15 p-8 flex items-center justify-center">
                    <Building2 className="h-48 w-48 text-primary/40" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-card border-2 border-secondary rounded-xl p-4 shadow-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-secondary">1-3 Days</p>
                      <p className="text-xs text-muted-foreground">Approval Time</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>;
};
export default InstitutionCTA;
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Play } from "lucide-react";
const DemoCTA = () => {
  return <section className="section-padding bg-primary/5">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          <span className="section-label mb-6 inline-block">
            Ready to Get Started?
          </span>
          <h2 className="mb-6">
            See LittleLedger in Action
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            Join the growing number of NYC preschools that trust LittleLedger 
            for their compliance management. Start your free trial today.
          </p>

          

          <p className="mt-6 text-sm text-muted-foreground">Free 30-day trial · Cancel anytime</p>
        </div>
      </div>
    </section>;
};
export default DemoCTA;
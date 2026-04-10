import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Users,
  UserCircle,
  CheckCircle,
} from "lucide-react";

const pillars = [
  {
    icon: Building2,
    title: "For Schools",
    color: "from-primary/20 to-primary/5",
    features: [
      "Compliance Dashboard",
      "Multi-Campus Support",
      "Custom Requirements",
      "Document Review",
      "Analytics & Reports",
    ],
  },
  {
    icon: Users,
    title: "For Staff",
    color: "from-secondary/20 to-secondary/5",
    features: [
      "Credential Tracking",
      "Onboarding Workflows",
      "Expiration Alerts",
      "Training Records",
      "Background Checks",
    ],
  },
  {
    icon: UserCircle,
    title: "For Parents",
    color: "from-accent/30 to-accent/10",
    features: [
      "Easy Document Upload",
      "Progress Visibility",
      "Expiration Reminders",
      "Multi-Child Support",
      "Mobile Friendly",
    ],
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Everyone
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            One platform that works for schools, staff, and parents
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pillars.map((pillar, index) => (
            <Card
              key={index}
              className="border-border/50 bg-card hover:shadow-xl transition-all duration-300 group overflow-hidden"
            >
              <CardContent className="p-8">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <pillar.icon className="h-8 w-8 text-foreground" />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-6">
                  {pillar.title}
                </h3>

                <ul className="space-y-3">
                  {pillar.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

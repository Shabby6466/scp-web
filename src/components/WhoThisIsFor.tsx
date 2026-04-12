import { Card, CardContent } from "@/components/ui/card";
import {
  School,
  Users,
  UserCheck,
  Building2,
  Briefcase,
  GraduationCap,
} from "lucide-react";

const audiences = [
  {
    icon: School,
    title: "Preschool Directors",
    description: "Streamline compliance across your entire center",
  },
  {
    icon: Building2,
    title: "Multi-Site Operators",
    description: "Manage all locations from one dashboard",
  },
  {
    icon: Users,
    title: "Administrative Staff",
    description: "Reduce paperwork and manual follow-ups",
  },
  {
    icon: UserCheck,
    title: "Parents",
    description: "Easy document submission from any device",
  },
  {
    icon: GraduationCap,
    title: "Teachers",
    description: "Track credentials and certifications",
  },
  {
    icon: Briefcase,
    title: "Compliance Officers",
    description: "Stay inspection-ready year-round",
  },
];

const WhoThisIsFor = () => {
  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Who Uses SCP
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Trusted by childcare professionals across NYC
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {audiences.map((audience, index) => (
            <Card
              key={index}
              className="border-border/50 bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-300 group"
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
                  <audience.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {audience.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {audience.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoThisIsFor;

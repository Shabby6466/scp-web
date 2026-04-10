import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  LayoutDashboard,
  Bell,
  GraduationCap,
  Building2,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Parent Portal",
    description: "Parents upload documents from any device",
    color: "from-blue-500/20 to-blue-600/10",
  },
  {
    icon: LayoutDashboard,
    title: "Compliance Dashboard",
    description: "Real-time visibility into school-wide status",
    color: "from-emerald-500/20 to-emerald-600/10",
  },
  {
    icon: Bell,
    title: "Expiration Tracking",
    description: "Automatic alerts 60, 30, and 7 days before expiry",
    color: "from-amber-500/20 to-amber-600/10",
  },
  {
    icon: GraduationCap,
    title: "Teacher Credentials",
    description: "Track certifications, background checks, training",
    color: "from-purple-500/20 to-purple-600/10",
  },
  {
    icon: Building2,
    title: "Multi-Campus",
    description: "Manage all locations from one dashboard",
    color: "from-rose-500/20 to-rose-600/10",
  },
  {
    icon: FileText,
    title: "DOH Reports",
    description: "Generate inspection-ready reports instantly",
    color: "from-cyan-500/20 to-cyan-600/10",
  },
];

const FeatureCarousel = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Powerful tools designed for childcare compliance
          </p>
        </div>

        <div className="relative px-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {features.map((feature, index) => (
                <CarouselItem
                  key={index}
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="border-border/50 bg-card hover:shadow-lg transition-all duration-300 group h-full">
                    <CardContent className="p-8">
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <feature.icon className="h-7 w-7 text-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default FeatureCarousel;

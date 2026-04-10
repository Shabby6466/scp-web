import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, UserCircle } from "lucide-react";
import adminMockup from "@/assets/dashboard-admin-mockup.png";
import schoolMockup from "@/assets/dashboard-school-mockup.png";
import parentMockup from "@/assets/dashboard-parent-mockup.png";

const dashboards = [
  {
    id: "school",
    label: "School Dashboard",
    icon: Building2,
    description: "Complete visibility into your school's compliance status, student files, and document management.",
    features: ["Real-time compliance metrics", "Document review queue", "Expiration alerts", "Staff management"],
    image: schoolMockup
  },
  {
    id: "admin",
    label: "Admin Portal",
    icon: UserCircle,
    description: "Platform-wide administration for managing schools, users, and system-wide compliance reporting.",
    features: ["Multi-school oversight", "Audit trail access", "User management", "Analytics dashboard"],
    image: adminMockup
  },
  {
    id: "parent",
    label: "Parent Portal",
    icon: Users,
    description: "Simple, mobile-friendly interface for parents to upload documents and track their children's compliance status.",
    features: ["Easy document upload", "Progress tracking", "Expiration notifications", "Multiple children support"],
    image: parentMockup
  }
];

const ProductPreview = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <span className="section-label mb-6 inline-block">
              Platform Preview
            </span>
            <h2 className="mb-6">
              Powerful Dashboards for Every Role
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              From administrators to parents, every user gets a purpose-built experience 
              designed for their needs.
            </p>
          </div>

          {/* Dashboard tabs */}
          <Tabs defaultValue="school" className="w-full">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-8">
              {dashboards.map((dashboard) => (
                <TabsTrigger 
                  key={dashboard.id} 
                  value={dashboard.id}
                  className="flex items-center gap-2"
                >
                  <dashboard.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{dashboard.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {dashboards.map((dashboard) => (
              <TabsContent key={dashboard.id} value={dashboard.id}>
                <Card className="overflow-hidden border-border/50">
                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-2 gap-0">
                      {/* Content side */}
                      <div className="p-8 lg:p-12 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <dashboard.icon className="h-5 w-5 text-primary" />
                          </div>
                          <h3 className="text-2xl font-semibold">{dashboard.label}</h3>
                        </div>
                        
                        <p className="text-muted-foreground mb-6 leading-relaxed">
                          {dashboard.description}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {dashboard.features.map((feature, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary"
                              className="bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Image side */}
                      <div className="bg-gradient-to-br from-secondary/5 to-primary/5 p-8 flex items-center justify-center min-h-[300px] lg:min-h-[400px]">
                        <div className="relative w-full max-w-md">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-2xl" />
                          <img
                            src={dashboard.image}
                            alt={dashboard.label}
                            className="relative rounded-xl shadow-2xl w-full h-auto object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default ProductPreview;

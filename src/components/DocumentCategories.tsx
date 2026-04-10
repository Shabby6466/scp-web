import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Syringe, Phone, FileText, Camera, Clipboard } from "lucide-react";

const categories = [
  {
    icon: Syringe,
    title: "Immunization Records",
    description: "COVID-19, MMR, DTaP, and all required vaccinations",
    required: true,
    label: "Medical Document",
  },
  {
    icon: Heart,
    title: "Health Forms",
    description: "Physical examination and medical history",
    required: true,
    label: "Medical Document",
  },
  {
    icon: Phone,
    title: "Emergency Contacts",
    description: "Authorized pickup persons and emergency numbers",
    required: true,
    label: "Required Document",
  },
  {
    icon: FileText,
    title: "Birth Certificate",
    description: "Official proof of age and identity",
    required: true,
    label: "Required Document",
  },
  {
    icon: Clipboard,
    title: "Allergy Information",
    description: "Food allergies, medications, and action plans",
    required: false,
    label: "Optional Document",
  },
  {
    icon: Camera,
    title: "Photo Consent",
    description: "Media release and photo permissions",
    required: false,
    label: "Optional Document",
  },
];

const DocumentCategories = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4">
        <div className="text-center mb-4">
          <span className="text-sm font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-4 py-2 rounded-full inline-block mb-6">
            Document Requirements
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground" id="documents">
            Student Safety Paperwork
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We support all NYC DOH-required documents for seamless enrollment and compliance
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
          {categories.map((category, index) => (
            <Card 
              key={index}
              className="border-border transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-secondary/50 bg-card group cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <category.icon className="h-7 w-7 text-primary" />
                  </div>
                  {category.required ? (
                    <Badge variant="destructive" className="text-xs font-bold px-3 py-1">Required</Badge>
                  ) : (
                    <Badge className="text-xs font-bold px-3 py-1 bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800">Optional</Badge>
                  )}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                  {category.label}
                </div>
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-secondary transition-colors">{category.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{category.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DocumentCategories;

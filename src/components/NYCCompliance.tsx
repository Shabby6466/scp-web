import { Card, CardContent } from "@/components/ui/card";
import { Shield, FileCheck, Clock, Bell, Building2, Users, Syringe, FileText, CheckCircle2 } from "lucide-react";
const complianceFeatures = [{
  icon: Syringe,
  title: "Immunization Tracking",
  description: "Automatically track required vaccines per NYC DOH Form CH-205 requirements"
}, {
  icon: FileCheck,
  title: "DOH Form Management",
  description: "Organize all required forms including medical, emergency contacts, and authorizations"
}, {
  icon: Clock,
  title: "Expiration Alerts",
  description: "Automatic reminders 60, 30, and 7 days before documents expire"
}, {
  icon: Bell,
  title: "Compliance Dashboard",
  description: "Real-time visibility into school-wide compliance status at a glance"
}, {
  icon: Building2,
  title: "Multi-Location Support",
  description: "Manage multiple branches and campuses from a single dashboard"
}, {
  icon: Users,
  title: "Staff Compliance",
  description: "Track teacher certifications, background checks, and training records"
}];
const stats = [{
  value: "100%",
  label: "DOH Compliant"
}, {
  value: "50+",
  label: "NYC Schools"
}, {
  value: "10,000+",
  label: "Documents Managed"
}, {
  value: "99.9%",
  label: "Uptime"
}];
const NYCCompliance = () => {
  return <section className="section-padding bg-secondary/5">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="section-label mb-6 inline-block">
              NYC DOH Ready
            </span>
            <h2 className="mb-6 text-3xl">
              Built for NYC Preschools & Childcare Centers
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Purpose-built to meet New York City Department of Health requirements. 
              Stop worrying about compliance audits and focus on what matters—your students.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => <div key={index} className="text-center">
                
                
              </div>)}
          </div>

          {/* Feature grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complianceFeatures.map((feature, index) => <Card key={index} className="group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border-border/50">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>)}
          </div>

          {/* Trust badges */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-6 px-8 py-4 bg-card rounded-2xl border border-border/50 shadow-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#cf0000]" />
                <span className="text-sm font-medium">HIPAA Compliant</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">DOH Ready</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#f59f00]" />
                <span className="text-sm font-medium">Smart Form Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default NYCCompliance;
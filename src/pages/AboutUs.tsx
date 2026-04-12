import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, Users, Target, Heart, Shield } from "lucide-react";
import heroImage from "@/assets/hero-background.png";
const AboutUs = () => {
  return <div className="min-h-screen">
    <Header />
    <main>
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.95) 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} />
        <div className="container relative z-10 px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 text-foreground">
              About SCP
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              We're on a mission to simplify document management for preschools and early childhood education centers,
              allowing educators to focus on what they do best—nurturing young minds.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 bg-background">
        <div className="container px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mb-6">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-4 text-foreground">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To eliminate administrative burdens and empower schools with technology that makes compliance simple and parent communication seamless.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-secondary/20">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/15 mb-6">
                  <Heart className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-4 text-foreground">Our Values</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Integrity, simplicity, and dedication to the educational community. We believe in creating tools that genuinely improve daily operations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mb-6">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-4 text-foreground">Our Commitment</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We prioritize security and privacy, ensuring every document is protected with bank-level encryption and HIPAA compliance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Client Showcase */}
      <section className="py-24 bg-muted/50">
        <div className="container px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-full mb-6">
              <span className="text-sm font-semibold text-secondary tracking-wide">TRUSTED PARTNER</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
              Proudly Serving Manhattan Schoolhouse
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
              Helping NYC's premier preschools save time, stay compliant, and focus on what matters most—educating children
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mb-6">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-3xl font-display font-bold mb-4 text-foreground">Manhattan Schoolhouse</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed font-medium">
                    A premier early childhood education center in the heart of Manhattan,
                    dedicated to providing exceptional care and inspiring learning experiences for young children.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>Manhattan, New York City</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Users className="h-5 w-5 text-primary" />
                      <span>Trusted by hundreds of NYC families</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-6 rounded-xl bg-background border-2 border-border">
                    <div className="text-4xl font-display font-bold text-primary mb-2">100%</div>
                    <p className="text-sm text-muted-foreground font-semibold">Digital Documentation</p>
                  </div>
                  <div className="p-6 rounded-xl bg-background border-2 border-border">
                    <div className="text-4xl font-display font-bold text-secondary mb-2">24/7</div>
                    <p className="text-sm text-muted-foreground font-semibold">Parent Access</p>
                  </div>
                  <div className="p-6 rounded-xl bg-background border-2 border-border">
                    <div className="text-4xl font-display font-bold text-primary mb-2">Safe</div>
                    <p className="text-sm text-muted-foreground font-semibold">Secure Storage</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-background">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-display font-bold mb-8 text-foreground text-center">Our Story</h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p className="text-lg">
                SCP was born from firsthand experience with the administrative challenges faced by preschools and early childhood education centers.
                We witnessed educators spending countless hours managing paperwork instead of teaching, and parents struggling to keep track of required documents.
              </p>
              <p className="text-lg">
                We knew there had to be a better way. Drawing on our expertise in education technology and early childhood institutions we created SCP, a platform designed specifically for the unique needs of early childhood education.
              </p>
              <p className="text-lg">
                Today, we're proud to partner with schools across the country, helping them streamline operations, maintain compliance, and create better
                experiences for families. Our commitment to security, simplicity, and support has made us the trusted choice for forward-thinking educational institutions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>;
};
export default AboutUs;
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Lock, Building2, Sparkles } from "lucide-react";
import parentDashboard from "@/assets/dashboard-parent-mockup.png";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--secondary) / 0.15) 0%, transparent 50%), 
                           radial-gradient(circle at 80% 80%, hsl(var(--primary) / 0.1) 0%, transparent 50%)`,
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), 
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container relative z-10 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Copy */}
            <div className="space-y-8">
              {/* Section label with shimmer */}
              <div className="inline-block animate-fade-in">
                <span className="relative inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 overflow-hidden group">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>NYC DOH Aligned</span>
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                </span>
              </div>

              {/* Headline with gradient text */}
              <h1
                className="animate-fade-in-up"
                style={{ animationDelay: '0.1s' }}
              >
                <span className="text-display block">
                  The Compliance Platform for
                </span>
                <span className="text-display block mt-1 bg-gradient-to-r from-secondary via-secondary to-secondary-hover bg-clip-text text-transparent">
                  Preschools
                </span>
              </h1>

              {/* Subheading */}
              <p
                className="text-lg text-muted-foreground leading-relaxed max-w-lg animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
              >
                Upload once. Track everything. Stay DOH compliant. SCP streamlines document management for schools and families.
              </p>

              {/* CTAs with enhanced styling */}
              <div
                className="flex flex-col sm:flex-row gap-3 pt-2 animate-fade-in-up"
                style={{ animationDelay: '0.3s' }}
              >
                <Button
                  size="xl"
                  variant="premium"
                  className="group"
                  onClick={() => window.location.href = '/institution-auth'}
                >
                  Apply Now
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  className="group"
                  onClick={() => window.location.href = '/how-it-works'}
                >
                  See How It Works
                  <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                </Button>
              </div>

              {/* Trust badges with hover effects */}
              <div
                className="flex flex-wrap gap-3 pt-4 animate-fade-in-up"
                style={{ animationDelay: '0.4s' }}
              >
                {[
                  { icon: Shield, text: "NYC DOH Aligned" },
                  { icon: Lock, text: "HIPAA Compliant" },
                  { icon: Building2, text: "Built for Preschools" },
                ].map((badge, index) => (
                  <div
                    key={badge.text}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border/50 text-foreground shadow-sm hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                  >
                    <badge.icon className="h-4 w-4 text-secondary" />
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Dashboard mockup with floating elements */}
            <div
              className="relative hidden lg:block animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="relative">
                {/* Glow effect behind card */}
                <div className="absolute -inset-4 bg-gradient-to-r from-secondary/20 via-primary/10 to-secondary/20 rounded-2xl blur-2xl opacity-50" />

                {/* Main dashboard card */}
                <div className="relative rounded-xl overflow-hidden border border-border/30 shadow-2xl bg-card">
                  <img
                    src={parentDashboard}
                    alt="SCP dashboard showing student documents and compliance status"
                    className="w-full h-auto"
                  />
                  {/* Subtle overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/10 via-transparent to-transparent" />
                </div>

                {/* Floating stat badge - top right with animation */}
                <div
                  className="absolute -top-4 -right-4 bg-card border border-border/50 px-4 py-3 rounded-xl shadow-lg animate-float"
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <p className="text-sm font-semibold text-foreground">100% DOH Compliant</p>
                  </div>
                </div>

                {/* Floating stat badge - bottom left with animation */}
                <div
                  className="absolute -bottom-4 -left-4 bg-card border border-border/50 px-4 py-3 rounded-xl shadow-lg animate-float"
                  style={{ animationDelay: '0.8s' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground"
                        >
                          {['JD', 'SM', 'AK'][i - 1]}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-foreground">98% Parent Satisfaction</p>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-1/2 -right-8 w-16 h-16 bg-secondary/10 rounded-full blur-xl animate-pulse-glow" />
                <div className="absolute bottom-1/4 -left-6 w-12 h-12 bg-primary/10 rounded-full blur-xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;

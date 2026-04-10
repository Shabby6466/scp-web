import { Shield, CheckCircle, Award, Clock } from "lucide-react";

const stats = [
  { icon: Shield, label: "100% DOH Ready" },
  { icon: CheckCircle, label: "50+ NYC Schools" },
  { icon: Award, label: "10,000+ Docs Managed" },
  { icon: Clock, label: "99.9% Uptime" },
];

const badges = [
  "HIPAA Compliant",
  "NYC DOH Aligned",
  "SOC 2 Ready",
];

const SocialProofBar = () => {
  return (
    <section className="py-8 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm font-medium text-foreground/80"
              >
                <stat.icon className="h-4 w-4 text-primary" />
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="flex items-center gap-3">
            {badges.map((badge, index) => (
              <span
                key={index}
                className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofBar;

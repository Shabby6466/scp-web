import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/20",
        secondary: "bg-muted text-muted-foreground",
        destructive: "bg-error-light text-error-foreground border border-error/20",
        outline: "border border-border text-foreground bg-transparent",
        // Semantic variants - premium with dot indicators
        success: "bg-success-light text-success-foreground border border-success/20",
        warning: "bg-warning-light text-warning-foreground border border-warning/20",
        error: "bg-error-light text-error-foreground border border-error/20",
        info: "bg-info-light text-info-foreground border border-info/20",
        // Muted/neutral variant
        muted: "bg-muted text-muted-foreground",
        // Premium variants with dots
        "success-dot": "bg-success-light text-success-foreground border border-success/20 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success",
        "warning-dot": "bg-warning-light text-warning-foreground border border-warning/20 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-warning",
        "error-dot": "bg-error-light text-error-foreground border border-error/20 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-error animate-pulse-glow",
        "info-dot": "bg-info-light text-info-foreground border border-info/20 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-info",
        // Gold/premium badge
        premium: "bg-secondary/15 text-secondary-foreground border border-secondary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

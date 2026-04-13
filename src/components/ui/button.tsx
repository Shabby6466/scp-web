import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary = Navy (main CTA) - Enhanced with glow
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md active:scale-[0.98] active:shadow-sm",
        // Accent = Gold (secondary emphasis) - Premium glow effect
        accent: "bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm hover:shadow-md hover:shadow-secondary/20 active:scale-[0.98]",
        // Destructive = Deep Red
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover shadow-sm hover:shadow-md active:scale-[0.98]",
        // Outline = Clean border with subtle hover
        outline: "border border-border bg-background text-foreground hover:bg-muted/50 hover:border-border/80 active:scale-[0.98]",
        primary: "bg-[#000A1E] text-white hover:bg-[#000A1E]/90 shadow-sm hover:shadow-md active:scale-[0.95] rounded-full",
        // Secondary = Muted background
        secondary: "bg-[#E8E8E8] text-slate-900 hover:bg-[#E8E8E8]/90 shadow-sm hover:shadow-md active:scale-[0.95] rounded-full",
        signal: "bg-[#FF4500] text-white hover:bg-[#FF4500]/90 shadow-sm hover:shadow-md active:scale-[0.95] rounded-full",
        // Ghost = Minimal with subtle feedback
        ghost: "text-foreground hover:bg-muted/50 active:bg-muted/70",
        // Link style
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
        // Success variant
        success: "bg-success text-white hover:bg-success/90 shadow-sm hover:shadow-md active:scale-[0.98]",
        // Premium = Gradient button
        premium: "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-md hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 text-sm rounded-lg [&_svg]:size-4",
        sm: "h-8 px-3 text-xs rounded-lg [&_svg]:size-3.5",
        lg: "h-10 px-5 text-sm rounded-lg [&_svg]:size-4",
        xl: "h-11 px-6 text-base rounded-xl [&_svg]:size-5",
        icon: "h-9 w-9 rounded-lg [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-lg [&_svg]:size-3.5",
        "icon-lg": "h-10 w-10 rounded-lg [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

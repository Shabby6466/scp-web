import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StaggeredGridProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggeredGrid({ children, className, staggerDelay = 50 }: StaggeredGridProps) {
  return (
    <div className={cn("grid", className)}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div 
              key={index} 
              className="animate-stagger-in opacity-0"
              style={{ animationDelay: `${index * staggerDelay}ms`, animationFillMode: 'forwards' }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
}

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={cn("animate-fade-in-up", className)}>
      {children}
    </div>
  );
}

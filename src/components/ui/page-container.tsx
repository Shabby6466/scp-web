import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function PageContainer({ className, children, title, description, ...props }: PageContainerProps) {
  return (
    <div 
      className={cn(
        "max-w-[1280px] mx-auto px-4 py-4 sm:px-6 sm:py-6",
        className
      )} 
      {...props}
    >
      {(title || description) && (
        <div className="mb-6">
          {title && <h1 className="text-2xl font-semibold text-foreground">{title}</h1>}
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

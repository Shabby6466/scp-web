import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "rounded-md bg-muted/70 animate-skeleton",
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };
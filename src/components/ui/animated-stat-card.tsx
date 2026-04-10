import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AnimatedStatCardProps {
  value: number;
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  suffix?: string;
  prefix?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
  className?: string;
}

export function AnimatedStatCard({
  value,
  label,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  suffix = "",
  prefix = "",
  trend,
  delay = 0,
  className,
}: AnimatedStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, value, delay]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-300",
        "hover:shadow-md hover:border-border/60 hover:-translate-y-0.5",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-3xl font-semibold tracking-tight text-foreground tabular-nums",
            isVisible && "animate-count-up"
          )}>
            {prefix}{displayValue.toLocaleString()}{suffix}
          </p>
          <p className="text-sm text-muted-foreground mt-1 truncate">{label}</p>
          
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-2 text-xs font-medium px-1.5 py-0.5 rounded",
              trend.isPositive 
                ? "text-success bg-success-light" 
                : "text-error bg-error-light"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "shrink-0 p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110",
          iconBg
        )}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// Simple stat display without animation for inline use
interface StatValueProps {
  value: number;
  animated?: boolean;
  className?: string;
}

export function StatValue({ value, animated = true, className }: StatValueProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [animated]);

  useEffect(() => {
    if (!isVisible || !animated) return;

    const duration = 800;
    const steps = 20;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isVisible, value, animated]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {displayValue.toLocaleString()}
    </span>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Calculator, DollarSign, Clock, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const AnimatedNumber = ({ value, prefix = "", suffix = "", className = "" }: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 500;
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (value - startValue) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

const ROICalculator = () => {
  const [students, setStudents] = useState(50);
  const [teachers, setTeachers] = useState(6);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [branches, setBranches] = useState(1);

  // Calculations
  const hourlyRate = 30;
  const efficiencyGain = 0.6;
  const violationCostPerStudent = 30; // Average annual risk per student
  const violationCostPerTeacher = 125; // Average annual risk per teacher

  const timeSavings = Math.round(hoursPerWeek * efficiencyGain * 52 * hourlyRate);
  const complianceSavings = Math.round(
    (students * violationCostPerStudent + teachers * violationCostPerTeacher) * branches
  );
  const totalAnnualSavings = timeSavings + complianceSavings;

  // Estimate subscription cost (using Pro tier at $79/month as baseline)
  const monthlySubscription = branches === 1 ? 79 : branches <= 3 ? 79 * branches * 0.85 : 79 * branches * 0.75;
  const annualSubscription = monthlySubscription * 12;
  const netSavings = totalAnnualSavings - annualSubscription;
  const roiPercentage = Math.round((netSavings / annualSubscription) * 100);

  return (
    <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <Calculator className="h-4 w-4" />
            ROI Calculator
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-foreground">
            See Your Potential Savings
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Calculate how much time and money you could save with automated compliance management
          </p>
        </div>

        <Card variant="elevated" className="max-w-5xl mx-auto overflow-hidden">
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Input Section */}
            <div className="p-6 lg:p-8">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-xl font-semibold">Your School Details</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Adjust the sliders to match your school's profile
                </CardDescription>
              </CardHeader>

              <div className="space-y-8">
                {/* Students Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-foreground">Number of Students</label>
                    <span className="text-lg font-bold text-primary">{students}</span>
                  </div>
                  <Slider
                    value={[students]}
                    onValueChange={(v) => setStudents(v[0])}
                    min={10}
                    max={300}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    <span>300</span>
                  </div>
                </div>

                {/* Teachers Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-foreground">Number of Teachers</label>
                    <span className="text-lg font-bold text-primary">{teachers}</span>
                  </div>
                  <Slider
                    value={[teachers]}
                    onValueChange={(v) => setTeachers(v[0])}
                    min={1}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>30</span>
                  </div>
                </div>

                {/* Hours Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-foreground">Hours/Week on Paperwork</label>
                    <span className="text-lg font-bold text-primary">{hoursPerWeek}h</span>
                  </div>
                  <Slider
                    value={[hoursPerWeek]}
                    onValueChange={(v) => setHoursPerWeek(v[0])}
                    min={2}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>2 hours</span>
                    <span>20 hours</span>
                  </div>
                </div>

                {/* Branches Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-foreground">Number of Branches</label>
                    <span className="text-lg font-bold text-primary">{branches}</span>
                  </div>
                  <Slider
                    value={[branches]}
                    onValueChange={(v) => setBranches(v[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="p-6 lg:p-8 bg-gradient-to-br from-primary/5 to-secondary/10">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-semibold">Your Potential Savings</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Based on industry averages and compliance data
                </CardDescription>
              </CardHeader>

              <div className="space-y-4 mb-8">
                {/* Time Savings */}
                <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Time Savings</p>
                    <p className="text-lg font-bold text-foreground">
                      <AnimatedNumber value={timeSavings} prefix="$" suffix="/year" />
                    </p>
                  </div>
                </div>

                {/* Compliance Savings */}
                <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Compliance Risk Avoided</p>
                    <p className="text-lg font-bold text-foreground">
                      <AnimatedNumber value={complianceSavings} prefix="$" suffix="/year" />
                    </p>
                  </div>
                </div>

                {/* Subscription Cost */}
                <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Est. Subscription Cost</p>
                    <p className="text-lg font-medium text-muted-foreground">
                      <AnimatedNumber value={Math.round(annualSubscription)} prefix="-$" suffix="/year" />
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Savings Hero */}
              <div className="p-6 bg-gradient-to-r from-primary to-primary/80 rounded-xl text-primary-foreground mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium opacity-90">Net Annual Savings</span>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs font-bold">
                    <TrendingUp className="h-3 w-3" />
                    <AnimatedNumber value={roiPercentage} suffix="% ROI" />
                  </div>
                </div>
                <p className="text-4xl font-bold">
                  <AnimatedNumber value={netSavings} prefix="$" />
                </p>
                <p className="text-sm opacity-75 mt-1">per year in savings and avoided risk</p>
              </div>

              <Button asChild size="lg" className="w-full font-semibold" variant="accent">
                <Link to="/school-register" className="flex items-center justify-center gap-2">
                  Start Saving Today
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                *Calculations based on industry data. Individual results may vary.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ROICalculator;

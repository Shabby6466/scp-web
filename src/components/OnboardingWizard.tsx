import { useState } from "react";
import { Check, Upload, Users, GraduationCap, Mail, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface OnboardingWizardProps {
  onComplete: () => void;
  schoolId: string;
}

const steps = [
  {
    id: 1,
    title: "Upload Required Documents",
    description: "Add your school's required document list and templates",
    icon: Upload,
    path: "/school/required-documents",
  },
  {
    id: 2,
    title: "Add Your Staff",
    description: "Invite teachers and administrators to the platform",
    icon: Users,
    path: "/school/teachers",
  },
  {
    id: 3,
    title: "Add Your Students",
    description: "Import student rosters and organize classrooms",
    icon: GraduationCap,
    path: "/school/students",
  },
  {
    id: 4,
    title: "Send Parent Invitations",
    description: "Invite parents to upload required documentation",
    icon: Mail,
    path: "/school/parents",
  },
  {
    id: 5,
    title: "Monitor Compliance",
    description: "Track document status and generate reports",
    icon: BarChart3,
    path: "/school",
  },
];

const OnboardingWizard = ({ onComplete, schoolId }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleStepClick = (stepId: number, path: string) => {
    window.location.href = path;
  };

  const handleMarkComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    if (stepId < steps.length) {
      setCurrentStep(stepId);
    } else {
      onComplete();
    }
  };

  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <Card className="w-full max-w-4xl mx-auto border-2 border-secondary/20 shadow-xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl font-serif text-foreground">Welcome to Manhattan Schoolhouse!</CardTitle>
        <CardDescription className="text-lg mt-2">Let's get your school set up in 5 simple steps</CardDescription>
        <div className="mt-6">
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">{completedSteps.length} of {steps.length} steps completed</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === index;

          return (
            <Card 
              key={step.id} 
              className={`border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                isCompleted 
                  ? "border-secondary/50 bg-secondary/5" 
                  : isCurrent 
                  ? "border-primary shadow-lg scale-105" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => !isCompleted && handleStepClick(step.id, step.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div 
                    className={`flex items-center justify-center w-12 h-12 rounded-full ${
                      isCompleted 
                        ? "bg-secondary text-secondary-foreground" 
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl font-serif">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                  {!isCompleted && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkComplete(step.id);
                      }}
                    >
                      Start
                    </Button>
                  )}
                  {isCompleted && (
                    <span className="text-sm font-medium text-secondary">Completed ✓</span>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
        
        {completedSteps.length === steps.length && (
          <div className="text-center pt-6">
            <Button 
              size="lg" 
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={onComplete}
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingWizard;

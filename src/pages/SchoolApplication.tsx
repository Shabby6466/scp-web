import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SchoolApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    current_enrollment: "",
    expected_enrollment: "",
    age_groups: [] as string[],
    staff_count: "",
    features_needed: [] as string[],
    compliance_requirements: "",
    timeline: "",
    additional_notes: "",
  });

  const ageGroupOptions = [
    "Infants (0-12 months)",
    "Toddlers (1-2 years)",
    "Preschool (3-4 years)",
    "Pre-K (4-5 years)",
    "School Age (5+ years)",
  ];

  const featureOptions = [
    "Student Document Management",
    "Staff Document Management",
    "Parent Portal",
    "Compliance Tracking",
    "Expiration Reminders",
    "Multi-Location Management",
    "Custom Document Templates",
    "Bulk Upload",
  ];

  const handleAgeGroupChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      age_groups: prev.age_groups.includes(value)
        ? prev.age_groups.filter(g => g !== value)
        : [...prev.age_groups, value]
    }));
  };

  const handleFeatureChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      features_needed: prev.features_needed.includes(value)
        ? prev.features_needed.filter(f => f !== value)
        : [...prev.features_needed, value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in");
      navigate("/institution-auth");
      return;
    }

    if (!formData.current_enrollment || !formData.expected_enrollment || 
        !formData.staff_count || !formData.timeline) {
      toast.error("Please complete all required fields");
      return;
    }

    if (formData.age_groups.length === 0) {
      toast.error("Please select at least one age group");
      return;
    }

    if (formData.features_needed.length === 0) {
      toast.error("Please select at least one feature");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/school-applications', {
        currentEnrollment: formData.current_enrollment,
        expectedEnrollment: formData.expected_enrollment,
        ageGroups: formData.age_groups,
        staffCount: formData.staff_count,
        featuresNeeded: formData.features_needed,
        complianceRequirements: formData.compliance_requirements,
        timeline: formData.timeline,
        additionalNotes: formData.additional_notes,
        submittedAt: new Date().toISOString(),
      });

      toast.success("Application submitted successfully!");
      navigate("/school-approval-status");
    } catch (error: any) {
      console.error("Application submission error:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header hideParentPortal />
      <main className="flex-1 pt-20 pb-12">
        <div className="container max-w-3xl px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">School Application</CardTitle>
              <CardDescription>
                Tell us more about your school's needs so we can best serve you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Enrollment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Enrollment Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="current_enrollment">Current Student Enrollment *</Label>
                    <Input
                      id="current_enrollment"
                      type="number"
                      min="0"
                      required
                      value={formData.current_enrollment}
                      onChange={(e) => setFormData({ ...formData, current_enrollment: e.target.value })}
                      placeholder="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected_enrollment">Expected Enrollment (Next 12 months) *</Label>
                    <Input
                      id="expected_enrollment"
                      type="number"
                      min="0"
                      required
                      value={formData.expected_enrollment}
                      onChange={(e) => setFormData({ ...formData, expected_enrollment: e.target.value })}
                      placeholder="75"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="staff_count">Number of Staff Members *</Label>
                    <Input
                      id="staff_count"
                      type="number"
                      min="0"
                      required
                      value={formData.staff_count}
                      onChange={(e) => setFormData({ ...formData, staff_count: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Age Groups */}
                <div className="space-y-4">
                  <Label>Age Groups Served *</Label>
                  <div className="space-y-2">
                    {ageGroupOptions.map((group) => (
                      <div key={group} className="flex items-center space-x-2">
                        <Checkbox
                          id={group}
                          checked={formData.age_groups.includes(group)}
                          onCheckedChange={() => handleAgeGroupChange(group)}
                        />
                        <label
                          htmlFor={group}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {group}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features Needed */}
                <div className="space-y-4">
                  <Label>Features & Functionality Needed *</Label>
                  <div className="space-y-2">
                    {featureOptions.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature}
                          checked={formData.features_needed.includes(feature)}
                          onCheckedChange={() => handleFeatureChange(feature)}
                        />
                        <label
                          htmlFor={feature}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance Requirements */}
                <div className="space-y-2">
                  <Label htmlFor="compliance_requirements">
                    Specific Compliance Requirements (DOH, FERPA, etc.)
                  </Label>
                  <Textarea
                    id="compliance_requirements"
                    value={formData.compliance_requirements}
                    onChange={(e) => setFormData({ ...formData, compliance_requirements: e.target.value })}
                    placeholder="Tell us about any specific compliance requirements..."
                    rows={4}
                  />
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <Label>When do you need to start using LittleLedger? *</Label>
                  <RadioGroup
                    required
                    value={formData.timeline}
                    onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="immediately" id="immediately" />
                      <Label htmlFor="immediately" className="cursor-pointer font-normal">
                        Immediately
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1-month" id="1-month" />
                      <Label htmlFor="1-month" className="cursor-pointer font-normal">
                        Within 1 month
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3-months" id="3-months" />
                      <Label htmlFor="3-months" className="cursor-pointer font-normal">
                        Within 3 months
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="planning" id="planning" />
                      <Label htmlFor="planning" className="cursor-pointer font-normal">
                        Just planning ahead
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2">
                  <Label htmlFor="additional_notes">
                    Additional Information or Questions
                  </Label>
                  <Textarea
                    id="additional_notes"
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    placeholder="Anything else we should know?"
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

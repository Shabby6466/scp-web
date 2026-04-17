import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { eligibilityService } from "@/services/eligibilityService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageTransition } from "@/components/ui/animations";
import { ResumeUpload } from "@/components/eligibility/ResumeUpload";
import { 
  Save, 
  Brain, 
  GraduationCap, 
  Award,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  XCircle,
  AlertTriangle,
  Info,
  Mail,
  FileText,
  Shield,
} from "lucide-react";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: string;
  position_id: string | null;
}

/** `GET /teachers/:id` returns `full_name` (from `User.name`), not always `first_name` / `last_name`. */
function normalizeTeacherFromApi(data: Record<string, unknown> | null | undefined): Teacher | null {
  if (!data || typeof data.id !== "string") return null;
  const fn = (data.first_name ?? data.firstName) as string | undefined;
  const ln = (data.last_name ?? data.lastName) as string | undefined;
  let first_name = (fn ?? "").trim();
  let last_name = (ln ?? "").trim();
  if (!first_name && !last_name) {
    const raw = String(data.full_name ?? data.name ?? "").trim();
    if (raw) {
      const parts = raw.split(/\s+/);
      first_name = parts[0] ?? "";
      last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }
  }
  const school_id = String(data.school_id ?? data.schoolId ?? "");
  return {
    id: data.id,
    first_name,
    last_name,
    email: String(data.email ?? ""),
    school_id,
    position_id: (data.position_id ?? data.positionId ?? null) as string | null,
  };
}

function teacherInitials(t: Teacher): string {
  const a = t.first_name.trim()[0];
  const b = t.last_name.trim()[0];
  if (a && b) return `${a}${b}`.toUpperCase();
  if (a) return a.toUpperCase();
  if (b) return b.toUpperCase();
  const e = t.email.trim()[0];
  return e ? e.toUpperCase() : "?";
}

function teacherDisplayName(t: Teacher): string {
  const n = `${t.first_name} ${t.last_name}`.trim();
  return n || t.email || "Teacher";
}

interface Position {
  id: string;
  name: string;
  min_education_level: string | null;
  min_credits: number | null;
  min_ece_credits: number | null;
  min_years_experience: number | null;
  requires_cda: boolean | null;
  requires_state_cert: boolean | null;
}

interface EligibilityProfile {
  id?: string;
  teacher_id: string;
  school_id: string;
  education_level: string;
  education_field: string;
  total_credits: number;
  ece_credits: number;
  years_experience: number;
  resume_path: string | null;
  cda_credential: boolean;
  state_certification: string;
  first_aid_certified: boolean;
  cpr_certified: boolean;
  languages: string[];
  notes: string;
  ai_analysis: any;
  ai_analyzed_at: string | null;
}

interface PositionEligibility {
  position: Position;
  status: 'eligible' | 'needs_review' | 'not_eligible';
  missingRequirements: string[];
  metRequirements: string[];
}

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School Diploma', rank: 1 },
  { value: 'some_college', label: 'Some College', rank: 2 },
  { value: 'associates', label: "Associate's Degree", rank: 3 },
  { value: 'bachelors', label: "Bachelor's Degree", rank: 4 },
  { value: 'masters', label: "Master's Degree", rank: 5 },
  { value: 'doctorate', label: 'Doctorate', rank: 6 },
];

const EDUCATION_FIELDS = [
  'Early Childhood Education',
  'Child Development',
  'Elementary Education',
  'Special Education',
  'Psychology',
  'Social Work',
  'Other Education Field',
  'Non-Education Field',
];

function getEducationRank(level: string): number {
  const found = EDUCATION_LEVELS.find(l => l.value === level);
  return found?.rank || 0;
}

function evaluatePositionEligibility(profile: EligibilityProfile, position: Position): PositionEligibility {
  const missingRequirements: string[] = [];
  const metRequirements: string[] = [];

  if (position.min_education_level) {
    const requiredRank = getEducationRank(position.min_education_level);
    const teacherRank = getEducationRank(profile.education_level);
    if (teacherRank >= requiredRank) {
      const label = EDUCATION_LEVELS.find(l => l.value === position.min_education_level)?.label || position.min_education_level;
      metRequirements.push(`Education: ${label} or higher`);
    } else {
      const label = EDUCATION_LEVELS.find(l => l.value === position.min_education_level)?.label || position.min_education_level;
      missingRequirements.push(`Requires ${label}`);
    }
  }

  if (position.min_credits && position.min_credits > 0) {
    if ((profile.total_credits || 0) >= position.min_credits) {
      metRequirements.push(`${position.min_credits}+ college credits`);
    } else {
      const gap = position.min_credits - (profile.total_credits || 0);
      missingRequirements.push(`Needs ${gap} more credits`);
    }
  }

  if (position.min_ece_credits && position.min_ece_credits > 0) {
    if ((profile.ece_credits || 0) >= position.min_ece_credits) {
      metRequirements.push(`${position.min_ece_credits}+ ECE credits`);
    } else {
      const gap = position.min_ece_credits - (profile.ece_credits || 0);
      missingRequirements.push(`Needs ${gap} more ECE credits`);
    }
  }

  if (position.min_years_experience && position.min_years_experience > 0) {
    if ((profile.years_experience || 0) >= position.min_years_experience) {
      metRequirements.push(`${position.min_years_experience}+ years experience`);
    } else {
      const gap = position.min_years_experience - (profile.years_experience || 0);
      missingRequirements.push(`Needs ${gap} more years experience`);
    }
  }

  if (position.requires_cda) {
    if (profile.cda_credential) {
      metRequirements.push('CDA Credential');
    } else {
      missingRequirements.push('CDA Credential required');
    }
  }

  if (position.requires_state_cert) {
    if (profile.state_certification && profile.state_certification.trim() !== '') {
      metRequirements.push('State certification');
    } else {
      missingRequirements.push('State certification required');
    }
  }

  let status: 'eligible' | 'needs_review' | 'not_eligible';
  if (missingRequirements.length === 0) {
    status = 'eligible';
  } else if (missingRequirements.length <= 2) {
    status = 'needs_review';
  } else {
    status = 'not_eligible';
  }

  return { position, status, missingRequirements, metRequirements };
}

export default function TeacherEligibilityProfile() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [profile, setProfile] = useState<EligibilityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('none');
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (teacherId) {
      fetchData();
    }
  }, [teacherId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const teacherData = await api.get(`/teachers/${teacherId}`);
      const teacherNorm = normalizeTeacherFromApi(teacherData as Record<string, unknown>);
      if (!teacherNorm?.school_id) {
        setTeacher(null);
        setProfile(null);
        return;
      }
      setTeacher(teacherNorm);
      setSelectedPosition(teacherNorm.position_id || 'none');

      const positionsData = await api.get(`/teacher-positions?schoolId=${teacherNorm.school_id}&isActive=true`);
      setPositions(positionsData || []);

      try {
        const profileData = await eligibilityService.getByUser(teacherId!);
        if (profileData) {
          setProfile({
            ...profileData,
            languages: profileData.languages || [],
            education_level: profileData.education_level || 'none',
            education_field: profileData.education_field || 'none',
          });
        } else {
          throw new Error('no profile');
        }
      } catch {
        setProfile({
          teacher_id: teacherId!,
          school_id: teacherNorm.school_id,
          education_level: 'none',
          education_field: 'none',
          total_credits: 0,
          ece_credits: 0,
          years_experience: 0,
          resume_path: null,
          cda_credential: false,
          state_certification: '',
          first_aid_certified: false,
          cpr_certified: false,
          languages: [],
          notes: '',
          ai_analysis: null,
          ai_analyzed_at: null,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load teacher data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const positionEligibilities = useMemo(() => {
    if (!profile || positions.length === 0) return [];
    return positions.map(pos => evaluatePositionEligibility(profile, pos));
  }, [profile, positions]);

  const eligibleCount = positionEligibilities.filter(e => e.status === 'eligible').length;
  const needsReviewCount = positionEligibilities.filter(e => e.status === 'needs_review').length;

  const handleSave = async () => {
    if (!profile || !teacher) return;

    try {
      setSaving(true);

      const profileToSave = {
        ...profile,
        teacher_id: teacher.id,
        school_id: teacher.school_id,
        education_level: profile.education_level === 'none' ? '' : profile.education_level,
        education_field: profile.education_field === 'none' ? '' : profile.education_field,
      };

      await eligibilityService.upsert(teacher.id, profileToSave);

      const newPositionId = selectedPosition === 'none' ? null : selectedPosition;
      if (newPositionId !== teacher.position_id) {
        await api.patch(`/teachers/${teacher.id}`, { position_id: newPositionId });
      }

      toast({
        title: "Saved",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!profile || !teacher) return;

    try {
      setAnalyzing(true);
      setAiError(null);

      await handleSave();

      // TODO: Re-enable when AI analyze-teacher-eligibility endpoint is available
      const stubAnalysis = {
        recommended_positions: [] as Array<{ position: string; confidence: number; meets_requirements: boolean }>,
        strengths: ['Manual review required — AI analysis is not yet enabled'],
        gaps: [],
        summary: 'AI eligibility analysis is not currently available. Use the rules-based eligibility panel for position matching.',
      };

      setProfile(prev => prev ? {
        ...prev,
        ai_analysis: stubAnalysis,
        ai_analyzed_at: new Date().toISOString(),
      } : null);

      toast({
        title: "AI Analysis Unavailable",
        description: "AI analysis is not currently enabled. Showing placeholder results.",
      });
    } catch (error: any) {
      console.error('Error analyzing:', error);
      const errorMessage = error?.message || "AI analysis is currently unavailable.";
      setAiError(errorMessage);
      toast({
        title: "AI Analysis Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusBadge = (status: 'eligible' | 'needs_review' | 'not_eligible') => {
    switch (status) {
      case 'eligible':
        return <Badge variant="success-dot">Eligible</Badge>;
      case 'needs_review':
        return <Badge variant="warning-dot">Needs Review</Badge>;
      case 'not_eligible':
        return <Badge variant="error-dot">Not Eligible</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!teacher || !profile) {
    return (
      <div className="p-6">
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Teacher Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The requested teacher profile could not be found.
            </p>
            <Button onClick={() => navigate('/eligibility')}>
              Eligibility portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = teacherInitials(teacher);

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Premium Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-background shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold">{teacherDisplayName(teacher)}</h1>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {teacher.email}
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Education */}
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Education Level</Label>
                    <Select
                      value={profile.education_level || 'none'}
                      onValueChange={(v) => setProfile({ ...profile, education_level: v })}
                    >
                      <SelectTrigger className="h-11 bg-muted/50 border-border/50">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select level</SelectItem>
                        {EDUCATION_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Field of Study</Label>
                    <Select
                      value={profile.education_field || 'none'}
                      onValueChange={(v) => setProfile({ ...profile, education_field: v })}
                    >
                      <SelectTrigger className="h-11 bg-muted/50 border-border/50">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select field</SelectItem>
                        {EDUCATION_FIELDS.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total College Credits</Label>
                    <Input
                      type="number"
                      value={profile.total_credits}
                      onChange={(e) => setProfile({ ...profile, total_credits: parseInt(e.target.value) || 0 })}
                      className="h-11 bg-muted/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">ECE Credits</Label>
                    <Input
                      type="number"
                      value={profile.ece_credits}
                      onChange={(e) => setProfile({ ...profile, ece_credits: parseInt(e.target.value) || 0 })}
                      className="h-11 bg-muted/50 border-border/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experience & Certifications */}
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  Experience & Certifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Years of Experience</Label>
                    <Input
                      type="number"
                      value={profile.years_experience}
                      onChange={(e) => setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 })}
                      className="h-11 bg-muted/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">State Certification</Label>
                    <Input
                      value={profile.state_certification}
                      onChange={(e) => setProfile({ ...profile, state_certification: e.target.value })}
                      placeholder="e.g., NYS Teaching Certificate"
                      className="h-11 bg-muted/50 border-border/50"
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <Checkbox
                      id="cda"
                      checked={profile.cda_credential}
                      onCheckedChange={(c) => setProfile({ ...profile, cda_credential: !!c })}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor="cda" className="cursor-pointer text-sm font-medium">CDA Credential</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <Checkbox
                      id="first_aid"
                      checked={profile.first_aid_certified}
                      onCheckedChange={(c) => setProfile({ ...profile, first_aid_certified: !!c })}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <Label htmlFor="first_aid" className="cursor-pointer text-sm font-medium">First Aid</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <Checkbox
                      id="cpr"
                      checked={profile.cpr_certified}
                      onCheckedChange={(c) => setProfile({ ...profile, cpr_certified: !!c })}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <Label htmlFor="cpr" className="cursor-pointer text-sm font-medium">CPR Certified</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Assignment */}
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
                    <Briefcase className="h-4 w-4 text-violet-500" />
                  </div>
                  Position Assignment
                </CardTitle>
                <CardDescription>
                  Assign a role based on qualifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="h-11 bg-muted/50 border-border/50">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No position assigned</SelectItem>
                    {positions.map((pos) => {
                      const eligibility = positionEligibilities.find(e => e.position.id === pos.id);
                      return (
                        <SelectItem key={pos.id} value={pos.id}>
                          <div className="flex items-center gap-2">
                            {pos.name}
                            {eligibility && (
                              <span className={`text-xs ${
                                eligibility.status === 'eligible' ? 'text-emerald-500' :
                                eligibility.status === 'needs_review' ? 'text-amber-500' : 'text-destructive'
                              }`}>
                                ({eligibility.status === 'eligible' ? '✓' : eligibility.status === 'needs_review' ? '!' : '✗'})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Resume Upload */}
            <ResumeUpload
              teacherId={teacher.id}
              schoolId={teacher.school_id}
              currentPath={profile.resume_path}
              onPathChange={(path) => setProfile({ ...profile, resume_path: path })}
            />

            {/* Notes */}
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={profile.notes}
                  onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                  placeholder="Additional notes about qualifications or development needs..."
                  rows={4}
                  className="bg-muted/50 border-border/50 resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Eligibility Sidebar */}
          <div className="space-y-6">
            {/* Rules-Based Eligibility */}
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                    <Shield className="h-4 w-4 text-emerald-500" />
                  </div>
                  Position Eligibility
                </CardTitle>
                <CardDescription>Based on defined requirements</CardDescription>
              </CardHeader>
              <CardContent>
                {positions.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="rounded-full bg-muted p-3 w-fit mx-auto mb-3">
                      <Info className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">No positions defined yet</p>
                    <Button variant="link" size="sm" onClick={() => navigate('/eligibility?tab=positions')}>
                      Set up positions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Badge variant="success-dot" className="text-xs">
                        {eligibleCount} Eligible
                      </Badge>
                      <Badge variant="warning-dot" className="text-xs">
                        {needsReviewCount} Review
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {positionEligibilities.map((eligibility) => (
                        <div 
                          key={eligibility.position.id} 
                          className={`p-3 rounded-lg border transition-colors ${
                            eligibility.status === 'eligible' 
                              ? 'bg-emerald-500/5 border-emerald-500/20' 
                              : eligibility.status === 'needs_review'
                              ? 'bg-amber-500/5 border-amber-500/20'
                              : 'bg-destructive/5 border-destructive/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{eligibility.position.name}</span>
                            {getStatusBadge(eligibility.status)}
                          </div>
                          
                          {eligibility.missingRequirements.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {eligibility.missingRequirements.slice(0, 2).map((req, i) => (
                                <p key={i} className="text-xs text-destructive flex items-start gap-1">
                                  <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                  {req}
                                </p>
                              ))}
                              {eligibility.missingRequirements.length > 2 && (
                                <p className="text-xs text-muted-foreground">
                                  +{eligibility.missingRequirements.length - 2} more
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <Card variant={profile.ai_analysis ? "premium" : "elevated"}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  AI Analysis
                  <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>
                </CardTitle>
                {profile.ai_analyzed_at && (
                  <CardDescription>
                    Analyzed {new Date(profile.ai_analyzed_at).toLocaleDateString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {aiError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>AI Unavailable</AlertTitle>
                    <AlertDescription className="text-xs">
                      {aiError}
                    </AlertDescription>
                  </Alert>
                )}
                
                {profile.ai_analysis ? (
                  <div className="space-y-4">
                    {profile.ai_analysis.recommended_positions?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recommended</h4>
                        <div className="space-y-1.5">
                          {profile.ai_analysis.recommended_positions.slice(0, 3).map((rec: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <span className="text-sm font-medium">{rec.position}</span>
                              <Badge variant={rec.meets_requirements ? "success-dot" : "secondary"} className="text-xs">
                                {rec.confidence}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.ai_analysis.strengths?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {profile.ai_analysis.strengths.slice(0, 3).map((s: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {profile.ai_analysis.gaps?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Development Areas
                        </h4>
                        <ul className="space-y-1">
                          {profile.ai_analysis.gaps.slice(0, 3).map((g: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">• {g}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={handleAnalyze} 
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4 mr-2" />
                      )}
                      Re-analyze
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative rounded-full bg-gradient-to-br from-violet-500/20 to-primary/10 p-4 w-fit mx-auto ring-1 ring-violet-500/20">
                        <Brain className="h-8 w-8 text-violet-500" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get AI-powered insights on strengths and development needs
                    </p>
                    <Button onClick={handleAnalyze} disabled={analyzing} variant="premium" className="gap-2">
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Run AI Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

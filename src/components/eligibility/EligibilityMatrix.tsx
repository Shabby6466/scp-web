import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { branchService } from "@/services/branchService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Filter,
  Grid3X3,
} from "lucide-react";

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

interface TeacherProfile {
  id: string;
  first_name: string;
  last_name: string;
  branch_id: string | null;
  position_id: string | null;
  profile: {
    education_level: string;
    total_credits: number;
    ece_credits: number;
    years_experience: number;
    cda_credential: boolean;
    state_certification: string;
  } | null;
}

interface Branch {
  id: string;
  branch_name: string;
}

interface EligibilityMatrixProps {
  schoolId: string | null;
  branchId: string | null;
}

const EDUCATION_LEVELS = [
  { value: 'high_school', rank: 1 },
  { value: 'some_college', rank: 2 },
  { value: 'associates', rank: 3 },
  { value: 'bachelors', rank: 4 },
  { value: 'masters', rank: 5 },
  { value: 'doctorate', rank: 6 },
];

function getEducationRank(level: string): number {
  const found = EDUCATION_LEVELS.find(l => l.value === level);
  return found?.rank || 0;
}

type EligibilityStatus = 'eligible' | 'needs_review' | 'not_eligible';

function evaluateEligibility(
  profile: TeacherProfile['profile'],
  position: Position
): { status: EligibilityStatus; gaps: string[] } {
  if (!profile) return { status: 'not_eligible', gaps: ['No profile data'] };

  const gaps: string[] = [];

  if (position.min_education_level) {
    const requiredRank = getEducationRank(position.min_education_level);
    const teacherRank = getEducationRank(profile.education_level || '');
    if (teacherRank < requiredRank) {
      gaps.push('Education level');
    }
  }

  if (position.min_credits && (profile.total_credits || 0) < position.min_credits) {
    gaps.push(`${position.min_credits - (profile.total_credits || 0)} more credits needed`);
  }

  if (position.min_ece_credits && (profile.ece_credits || 0) < position.min_ece_credits) {
    gaps.push(`${position.min_ece_credits - (profile.ece_credits || 0)} more ECE credits needed`);
  }

  if (position.min_years_experience && (profile.years_experience || 0) < position.min_years_experience) {
    gaps.push(`${position.min_years_experience - (profile.years_experience || 0)} more years experience needed`);
  }

  if (position.requires_cda && !profile.cda_credential) {
    gaps.push('CDA required');
  }

  if (position.requires_state_cert && (!profile.state_certification || profile.state_certification.trim() === '')) {
    gaps.push('State certification required');
  }

  if (gaps.length === 0) return { status: 'eligible', gaps: [] };
  if (gaps.length <= 2) return { status: 'needs_review', gaps };
  return { status: 'not_eligible', gaps };
}

export function EligibilityMatrix({ schoolId, branchId }: EligibilityMatrixProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  const fetchData = async () => {
    if (!schoolId) return;

    try {
      setLoading(true);

      const branchParam = branchId ? `&branchId=${branchId}` : '';

      const [positionsData, teachersData, profilesData, branchesData] = await Promise.all([
        api.get(`/teacher-positions?schoolId=${schoolId}&isActive=true`),
        api.get(`/users?role=TEACHER&schoolId=${schoolId}${branchParam}`),
        api.get(`/eligibility-profiles?schoolId=${schoolId}`),
        branchService.listBySchool(schoolId),
      ]);

      setPositions(positionsData || []);

      const profileMap = new Map((profilesData || []).map((p: any) => [
        p.teacher_id,
        {
          education_level: p.education_level || '',
          total_credits: p.total_credits || 0,
          ece_credits: p.ece_credits || 0,
          years_experience: p.years_experience || 0,
          cda_credential: p.cda_credential || false,
          state_certification: p.state_certification || '',
        }
      ]));

      const teachersList: TeacherProfile[] = (teachersData || []).map((t: any) => ({
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        branch_id: t.branch_id,
        position_id: t.position_id,
        profile: profileMap.get(t.id) || null,
      }));

      setTeachers(teachersList);
      setBranches(branchesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load eligibility data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = selectedBranch === 'all' || t.branch_id === selectedBranch;
      return matchesSearch && matchesBranch;
    });
  }, [teachers, searchQuery, selectedBranch]);

  const matrix = useMemo(() => {
    return filteredTeachers.map(teacher => ({
      teacher,
      eligibilities: positions.map(position => ({
        position,
        ...evaluateEligibility(teacher.profile, position),
      })),
    }));
  }, [filteredTeachers, positions]);

  const getStatusIcon = (status: EligibilityStatus) => {
    switch (status) {
      case 'eligible':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'needs_review':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'not_eligible':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: EligibilityStatus) => {
    switch (status) {
      case 'eligible':
        return 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30';
      case 'needs_review':
        return 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30';
      case 'not_eligible':
        return 'bg-destructive/10 hover:bg-destructive/20 border-destructive/30';
    }
  };

  const stats = useMemo(() => {
    let eligible = 0;
    let needsReview = 0;
    let notEligible = 0;

    matrix.forEach(row => {
      row.eligibilities.forEach(e => {
        if (e.status === 'eligible') eligible++;
        else if (e.status === 'needs_review') needsReview++;
        else notEligible++;
      });
    });

    return { eligible, needsReview, notEligible };
  }, [matrix]);

  const handleExportCSV = () => {
    if (positions.length === 0 || matrix.length === 0) return;

    const headers = ['Staff Name', ...positions.map(p => p.name)].join(',');
    const rows = matrix.map(row => {
      const name = `"${row.teacher.first_name} ${row.teacher.last_name}"`;
      const statuses = row.eligibilities.map(e => e.status).join(',');
      return `${name},${statuses}`;
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eligibility-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Matrix exported to CSV",
    });
  };

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card variant="elevated" className="border-dashed">
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Grid3X3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No positions defined yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Set up positions in the Positions tab first to see the eligibility matrix.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {branches.length > 1 && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{stats.eligible} Eligible</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{stats.needsReview} Needs Review</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span>{stats.notEligible} Not Eligible</span>
          </div>
        </div>

        {/* Matrix Table */}
        <ScrollArea className="w-full">
          <div className="rounded-lg border">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                    Staff
                  </th>
                  {positions.map(pos => (
                    <th key={pos.id} className="text-center p-3 font-medium min-w-[100px]">
                      <div className="truncate max-w-[100px]" title={pos.name}>
                        {pos.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.length === 0 ? (
                  <tr>
                    <td colSpan={positions.length + 1} className="text-center py-8 text-muted-foreground">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  matrix.map(row => (
                    <tr key={row.teacher.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 sticky left-0 bg-background z-10">
                        <button
                          className="text-left hover:underline"
                          onClick={() => navigate(`/eligibility/${row.teacher.id}`)}
                        >
                          <span className="font-medium">{row.teacher.first_name} {row.teacher.last_name}</span>
                          {!row.teacher.profile && (
                            <Badge variant="outline" className="ml-2 text-xs">No Profile</Badge>
                          )}
                        </button>
                      </td>
                      {row.eligibilities.map(e => (
                        <td key={e.position.id} className="p-2 text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${getStatusColor(e.status)}`}
                                  onClick={() => navigate(`/eligibility/${row.teacher.id}`)}
                                >
                                  {getStatusIcon(e.status)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-medium capitalize mb-1">{e.status.replace('_', ' ')}</p>
                                {e.gaps.length > 0 ? (
                                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                                    {e.gaps.map((gap, i) => (
                                      <li key={i}>{gap}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-emerald-600">Meets all requirements</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

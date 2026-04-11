import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, unwrapList } from "@/lib/api";
import { eligibilityService } from "@/services/eligibilityService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  Brain, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Loader2,
  Play,
  Square,
  Command,
  Users,
} from "lucide-react";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position_id: string | null;
  position_name: string | null;
  has_profile: boolean;
  has_analysis: boolean;
  analysis_date: string | null;
}

interface EligibilityStaffListProps {
  schoolId: string | null;
  branchId: string | null;
}

export function EligibilityStaffList({ schoolId, branchId }: EligibilityStaffListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkCancelled, setBulkCancelled] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  useEffect(() => {
    if (schoolId) {
      fetchStaff();
    }
  }, [schoolId, branchId]);

  const fetchStaff = async () => {
    if (!schoolId) return;

    try {
      setLoading(true);

      const [teachers, profiles] = await Promise.all([
        api
          .get(
            `/schools/${schoolId}/users?role=TEACHER${branchId ? `&branchId=${branchId}` : ''}&limit=500`,
          )
          .then(unwrapList),
        api.get(`/eligibility-profiles?schoolId=${schoolId}`),
      ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.teacher_id, p]));

      const staffList: StaffMember[] = (teachers || []).map((t: any) => {
        const profile = profileMap.get(t.id);
        return {
          id: t.id,
          first_name: t.first_name,
          last_name: t.last_name,
          email: t.email,
          position_id: t.position_id,
          position_name: t.teacher_positions?.name || t.position_name || null,
          has_profile: !!profile,
          has_analysis: !!profile?.ai_analysis,
          analysis_date: profile?.ai_analyzed_at || null,
        };
      });

      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to load staff",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAnalyze = async (staffMember: StaffMember) => {
    if (!staffMember.has_profile) {
      toast({
        title: "Profile Required",
        description: "Please complete the eligibility profile before running analysis",
        variant: "destructive",
      });
      return;
    }

    try {
      setAnalyzingId(staffMember.id);

      await eligibilityService.analyze(staffMember.id);

      fetchStaff();

      toast({
        title: "Analysis Complete",
        description: `${staffMember.first_name}'s eligibility has been analyzed`,
      });
    } catch (error) {
      console.error('Error analyzing:', error);
      toast({
        title: "Error",
        description: "Failed to run analysis",
        variant: "destructive",
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const getEligibleForAnalysis = useCallback(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return staff.filter(s => {
      if (!s.has_profile) return false;
      if (!s.analysis_date) return true;
      return new Date(s.analysis_date) < sevenDaysAgo;
    });
  }, [staff]);

  const handleBulkAnalyze = async () => {
    setShowBulkDialog(false);
    const toAnalyze = getEligibleForAnalysis();
    if (toAnalyze.length === 0) {
      toast({ title: "No staff to analyze", description: "All profiles are up to date" });
      return;
    }

    setBulkAnalyzing(true);
    setBulkCancelled(false);
    setBulkProgress({ current: 0, total: toAnalyze.length });

    let successCount = 0;
    for (let i = 0; i < toAnalyze.length; i++) {
      if (bulkCancelled) break;
      
      const member = toAnalyze[i];
      setBulkProgress({ current: i + 1, total: toAnalyze.length });

      try {
        await eligibilityService.analyze(member.id);
        successCount++;
      } catch (e) {
        console.error(`Failed to analyze ${member.first_name}:`, e);
      }
    }

    setBulkAnalyzing(false);
    fetchStaff();
    toast({
      title: "Bulk Analysis Complete",
      description: `Successfully analyzed ${successCount} of ${toAnalyze.length} staff members`,
    });
  };

  const getStatusBadge = (member: StaffMember) => {
    if (!member.has_profile) {
      return (
        <Badge variant="muted" className="gap-1">
          <Clock className="h-3 w-3" />
          No Profile
        </Badge>
      );
    }
    if (!member.has_analysis) {
      return (
        <Badge variant="warning-dot">
          Needs Analysis
        </Badge>
      );
    }
    return (
      <Badge variant="success-dot">
        Analyzed
      </Badge>
    );
  };

  const filteredStaff = staff.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const eligibleForAnalysis = getEligibleForAnalysis();

  if (loading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-500" />
              Run Bulk AI Analysis
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will analyze {eligibleForAnalysis.length} staff members who haven't been analyzed in the last 7 days. This may take a few minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAnalyze} className="bg-violet-600 hover:bg-violet-700">
              Start Analysis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">Staff Members</CardTitle>
          </div>
          {bulkAnalyzing ? (
            <div className="flex items-center gap-3">
              <div className="w-32">
                <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" animated />
              </div>
              <span className="text-sm text-muted-foreground">{bulkProgress.current}/{bulkProgress.total}</span>
              <Button variant="outline" size="sm" onClick={() => setBulkCancelled(true)}>
                <Square className="h-3 w-3 mr-1" /> Stop
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDialog(true)}
              disabled={eligibleForAnalysis.length === 0}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Run AI for All ({eligibleForAnalysis.length})
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {/* Enhanced Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-16 h-11 bg-muted/50 border-border/50 focus:bg-background"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>

          {/* Empty State */}
          {filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {searchQuery ? "No matching staff" : "No staff members"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery 
                  ? "Try adjusting your search terms."
                  : "Add staff members to manage their eligibility."
                }
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-medium">Staff Member</TableHead>
                    <TableHead className="font-medium">Current Position</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="text-right font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow 
                      key={member.id} 
                      className="group cursor-pointer"
                      onClick={() => navigate(`/eligibility/${member.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-background">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-medium">
                              {member.first_name[0]}{member.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.position_name ? (
                          <Badge variant="outline">{member.position_name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(member)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickAnalyze(member)}
                            disabled={analyzingId === member.id || !member.has_profile}
                            className="h-8 w-8 p-0"
                          >
                            {analyzingId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Brain className="h-4 w-4 text-violet-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/eligibility/${member.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

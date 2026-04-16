import { useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useComplianceData } from '@/hooks/useComplianceData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Users, GraduationCap, Heart, AlertTriangle, XCircle, ChevronRight, TrendingUp, Shield } from 'lucide-react';
import { StudentComplianceBreakdown } from '@/components/compliance/StudentComplianceBreakdown';
import { TeacherComplianceBreakdown } from '@/components/compliance/TeacherComplianceBreakdown';
import { ExpiringSoonList } from '@/components/compliance/ExpiringSoonList';
import { ExpiredDocumentsList } from '@/components/compliance/ExpiredDocumentsList';
import { Skeleton } from '@/components/ui/skeleton';

const DOHSection = () => {
  const { schoolId, isAdmin } = useUserRole();
  const { stats, expiringDocs, expiredDocs, loading } = useComplianceData(schoolId);
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' };
    if (rate >= 70) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-500/20' };
    return { text: 'text-rose-600', bg: 'bg-rose-500', ring: 'ring-rose-500/20' };
  };

  const studentRate = stats?.student_compliance_rate || 0;
  const teacherRate = stats?.teacher_compliance_rate || 0;
  const overallRate = stats ? ((studentRate + teacherRate) / 2) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <Badge variant="outline" className="mb-1 text-xs font-medium">Department of Health</Badge>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Health Compliance</h1>
              </div>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Immunization records, health forms, and medical documentation for students and staff.
            </p>
          </div>

          {/* Overall Score */}
          {!loading && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border shadow-sm">
              <div className={`relative w-16 h-16 rounded-xl ${getStatusColor(overallRate).ring} ring-4 bg-background flex items-center justify-center`}>
                <span className={`text-xl font-bold ${getStatusColor(overallRate).text}`}>
                  {overallRate.toFixed(0)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`h-4 w-4 ${getStatusColor(overallRate).text}`} />
                  <span className="font-semibold text-foreground">
                    {overallRate >= 90 ? 'Excellent' : overallRate >= 70 ? 'Good' : 'Needs Attention'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-2 w-full" />
            </Card>
          ))
        ) : (
          <>
            <Card className="group p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('students')}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Students</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${getStatusColor(studentRate).text}`}>
                {studentRate.toFixed(0)}%
              </p>
              <Progress value={studentRate} className="h-1.5 mt-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.compliant_students || 0} of {stats?.total_students || 0} compliant
              </p>
            </Card>

            <Card className="group p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('teachers')}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Teachers</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${getStatusColor(teacherRate).text}`}>
                {teacherRate.toFixed(0)}%
              </p>
              <Progress value={teacherRate} className="h-1.5 mt-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.compliant_teachers || 0} of {stats?.total_teachers || 0} compliant
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Expiring Soon</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats?.total_expiring_soon || 0}</p>
              <p className="text-xs text-muted-foreground mt-3">Within 60 days</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Expired</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-rose-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-rose-600">{stats?.total_expired || 0}</p>
              <p className="text-xs text-muted-foreground mt-3">Needs attention</p>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <GraduationCap className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="expiring" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Expiring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card 
              className="group cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all"
              onClick={() => setActiveTab('students')}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Student Records</p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.compliant_students || 0}/{stats?.total_students || 0} compliant
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>

            <Card 
              className="group cursor-pointer hover:shadow-md hover:border-purple-500/30 transition-all"
              onClick={() => setActiveTab('teachers')}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Staff Records</p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.compliant_teachers || 0}/{stats?.total_teachers || 0} compliant
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {!loading && (stats?.total_expired || 0) > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-rose-700 dark:text-rose-400">
                    {stats?.total_expired} expired documents need attention
                  </p>
                  <p className="text-sm text-rose-600/70 dark:text-rose-300/70">
                    Review and update these documents to maintain compliance
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                  onClick={() => setActiveTab('expiring')}
                >
                  Review
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <StudentComplianceBreakdown schoolId={schoolId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          <TeacherComplianceBreakdown schoolId={schoolId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="expiring" className="space-y-6">
          <ExpiringSoonList documents={expiringDocs} loading={loading} />
          <ExpiredDocumentsList documents={expiredDocs} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DOHSection;
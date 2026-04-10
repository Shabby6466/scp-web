import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, School, Users, GraduationCap, UserCircle, Bell, FileText, UserCog, Settings, ClipboardCheck } from 'lucide-react';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminSchools from '@/components/admin/AdminSchools';
import AdminStudents from '@/components/admin/AdminStudents';
import AdminParents from '@/components/admin/AdminParents';
import AdminTeachers from '@/components/admin/AdminTeachers';
import AdminDocuments from '@/components/admin/AdminDocuments';
import { AdminDirectors } from '@/components/admin/AdminDirectors';
import ReminderManagement from '@/pages/admin/ReminderManagement';
import { useUserRole } from '@/hooks/useUserRole';

/**
 * Admin - Now renders as content only (no layout wrapper).
 * The DashboardLayout is provided by AppShellLayout in the route.
 */
const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { isAdmin } = useUserRole();
  
  const canManageAllSchools = isAdmin;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Manage schools, users, documents, and platform settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/compliance-center')}
            className="gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Compliance Center
          </Button>
          {canManageAllSchools && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/settings')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start border-b bg-transparent p-0 h-auto overflow-x-auto">
          <TabsTrigger value="overview" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="parents" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
            <UserCircle className="h-4 w-4" />
            Parents
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
            <GraduationCap className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          {canManageAllSchools && (
            <>
              <TabsTrigger value="schools" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
                <School className="h-4 w-4" />
                Schools
              </TabsTrigger>
              <TabsTrigger value="directors" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
                <UserCog className="h-4 w-4" />
                Directors
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="documents" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 whitespace-nowrap">
            <Bell className="h-4 w-4" />
            Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <AdminStudents />
        </TabsContent>

        <TabsContent value="parents" className="mt-6">
          <AdminParents />
        </TabsContent>

        <TabsContent value="teachers" className="mt-6">
          <AdminTeachers />
        </TabsContent>

        {canManageAllSchools && (
          <>
            <TabsContent value="schools" className="mt-6">
              <AdminSchools />
            </TabsContent>
            
            <TabsContent value="directors" className="mt-6">
              <AdminDirectors />
            </TabsContent>
          </>
        )}

        <TabsContent value="documents" className="mt-6">
          <AdminDocuments />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <ReminderManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;

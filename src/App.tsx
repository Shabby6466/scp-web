import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { ParentRoute, SchoolRoute, DirectorRoute } from "@/components/routes";
import { AppShellLayout } from "@/components/layout";
import { useEffect } from "react";
import { AuthenticatedThemeProvider } from "@/components/AuthenticatedThemeProvider";

// Public Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import RoleSelection from "./pages/RoleSelection";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import AboutUs from "./pages/AboutUs";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import HowItWorksPage from "./pages/HowItWorksPage";
import InstitutionAuth from "./pages/InstitutionAuth";
import NotFound from "./pages/NotFound";
import NotAuthorized from "./pages/NotAuthorized";

// Parent Pages
import Dashboard from "./pages/Dashboard";
import ParentOnboarding from "./pages/ParentOnboarding";
import ChildFilePage from "./pages/parent/ChildFilePage";
import ParentProfilePage from "./pages/parent/ParentProfilePage";
import ChildDocumentUpload from "./pages/parent/ChildDocumentUpload";

// School Registration Pages (require auth but no specific role yet)
import SchoolRegister from "./pages/SchoolRegister";
import SchoolApplication from "./pages/SchoolApplication";
import SchoolApprovalStatus from "./pages/SchoolApprovalStatus";

// School Dashboard Pages - Content Components
import SchoolDashboard from "./pages/SchoolDashboard";
import PendingDocuments from "./pages/school/PendingDocuments";
import ExpiringDocuments from "./pages/school/ExpiringDocuments";
import TeacherCompliance from "./pages/school/TeacherCompliance";
import SchoolBranches from "./pages/school/SchoolBranches";
import SchoolSettings from "./pages/school/SchoolSettings";
import SchoolFilePage from "./pages/school/SchoolFilePage";
import AllDocumentsPage from "./pages/AllDocumentsPage";
import PersonFilePage from "./pages/PersonFilePage";
import SetupRequiredDocuments from "./pages/school/setup/SetupRequiredDocuments";
import SetupStaff from "./pages/school/setup/SetupStaff";
import SetupStudents from "./pages/school/setup/SetupStudents";
import SetupInvitations from "./pages/school/setup/SetupInvitations";

// Director Pages
import DirectorDashboard from "./pages/DirectorDashboard";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminStudents from "@/components/admin/AdminStudents";
import AdminParents from "@/components/admin/AdminParents";
import AdminTeachers from "@/components/admin/AdminTeachers";
import AdminSchools from "@/components/admin/AdminSchools";
import { AdminDirectors } from "@/components/admin/AdminDirectors";
import AdminDocumentsPage from "./pages/admin/AdminDocumentsPage";
import DOHCompliance from "./pages/DOHCompliance";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import RequiredDocumentsPage from "./pages/admin/RequiredDocumentsPage";
import StudentDetailPage from "./pages/admin/StudentDetailPage";
import StaffRequiredDocumentsPage from "./pages/admin/StaffRequiredDocumentsPage";
import TeacherDetailPage from "./pages/admin/TeacherDetailPage";
import MessageCenter from "./pages/admin/MessageCenter";
import AuditEventsPage from "./pages/admin/AuditEventsPage";
import SchoolDetailPage from "./pages/admin/SchoolDetailPage";
import ReminderManagement from "./pages/admin/ReminderManagement";
import PrivacyPolicySettings from "./pages/admin/PrivacyPolicySettings";
import AdminSettings from "./pages/admin/AdminSettings";
import AcceptSchoolInvite from "./pages/AcceptSchoolInvite";
import AcceptTeacherInvite from "./pages/AcceptTeacherInvite";
import AcceptDirectorInvite from "./pages/AcceptDirectorInvite";
import AcceptParentInvite from "./pages/AcceptParentInvite";

// Compliance Center Pages
import ComplianceCenterLanding from "./pages/compliance/ComplianceCenterLanding";
import DOHSection from "./pages/compliance/DOHSection";
import FacilitySafetySection from "./pages/compliance/FacilitySafetySection";
import CertificationsSection from "./pages/compliance/CertificationsSection";

// Eligibility Portal Pages
import EligibilityPortal from "./pages/eligibility/EligibilityPortal";
import TeacherEligibilityProfile from "./pages/eligibility/TeacherEligibilityProfile";

// Roster Import Pages
import ImportReviewPage from "./pages/roster/ImportReviewPage";

// In-Layout Pages
import NotFoundInLayout from "./pages/NotFoundInLayout";
import NotAuthorizedInLayout from "./pages/NotAuthorizedInLayout";

const queryClient = new QueryClient();

const ScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
              <ScrollToHash />
              <Routes>
                {/* ... existing routes ... */}
                <Route path="/" element={<Index />} />
                <Route path="/get-started" element={<RoleSelection />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin-auth" element={<AdminAuth />} />
                <Route path="/institution-auth" element={<InstitutionAuth />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/accept-school-invite" element={<AcceptSchoolInvite />} />
                <Route path="/accept-teacher-invite" element={<AcceptTeacherInvite />} />
                <Route path="/accept-director-invite" element={<AcceptDirectorInvite />} />
                <Route path="/accept-parent-invite" element={<AcceptParentInvite />} />
                <Route path="/not-authorized" element={<NotAuthorized />} />

                {/* ==================== PARENT ROUTES (separate layout) ==================== */}
                <Route element={<AuthenticatedThemeProvider><Outlet /></AuthenticatedThemeProvider>}>
                  <Route path="/dashboard" element={
                    <ParentRoute>
                      <Dashboard />
                    </ParentRoute>
                  } />
                  <Route path="/onboarding" element={
                    <ParentRoute>
                      <ParentOnboarding />
                    </ParentRoute>
                  } />
                  <Route path="/child/:childId" element={
                    <ParentRoute>
                      <ChildFilePage />
                    </ParentRoute>
                  } />
                  <Route path="/profile" element={
                    <ParentRoute>
                      <ParentProfilePage />
                    </ParentRoute>
                  } />
                  <Route path="/parent/child-documents/:studentId" element={
                    <ParentRoute>
                      <ChildDocumentUpload />
                    </ParentRoute>
                  } />
                </Route>

                {/* ==================== SCHOOL REGISTRATION ROUTES ==================== */}
                <Route path="/school-register" element={
                  <ProtectedRoute>
                    <SchoolRegister />
                  </ProtectedRoute>
                } />
                <Route path="/school-application" element={
                  <ProtectedRoute>
                    <SchoolApplication />
                  </ProtectedRoute>
                } />
                <Route path="/school-approval-status" element={
                  <ProtectedRoute>
                    <SchoolApprovalStatus />
                  </ProtectedRoute>
                } />

                {/* ==================== APP SHELL ROUTES (with sidebar) ==================== */}
                {/* All routes inside this group share the DashboardLayout with persistent sidebar */}
                <Route element={<AppShellLayout />}>
                  
                  {/* School Dashboard Routes */}
                  <Route path="/school-dashboard" element={
                    <SchoolRoute>
                      <SchoolDashboard />
                    </SchoolRoute>
                  } />
                  <Route path="/school/pending-documents" element={
                    <SchoolRoute>
                      <PendingDocuments />
                    </SchoolRoute>
                  } />
                  <Route path="/school/expiring-documents" element={
                    <SchoolRoute>
                      <ExpiringDocuments />
                    </SchoolRoute>
                  } />
                  <Route path="/school/teacher-compliance" element={
                    <SchoolRoute>
                      <TeacherCompliance />
                    </SchoolRoute>
                  } />
                  <Route path="/school/branches" element={
                    <SchoolRoute>
                      <SchoolBranches />
                    </SchoolRoute>
                  } />
                  <Route path="/school/settings" element={
                    <SchoolRoute>
                      <SchoolSettings />
                    </SchoolRoute>
                  } />
                  <Route path="/school/setup/required-documents" element={
                    <SchoolRoute>
                      <SetupRequiredDocuments />
                    </SchoolRoute>
                  } />
                  <Route path="/school/setup/staff" element={
                    <SchoolRoute>
                      <SetupStaff />
                    </SchoolRoute>
                  } />
                  <Route path="/school/setup/students" element={
                    <SchoolRoute>
                      <SetupStudents />
                    </SchoolRoute>
                  } />
                  <Route path="/school/setup/invitations" element={
                    <SchoolRoute>
                      <SetupInvitations />
                    </SchoolRoute>
                  } />
                  <Route path="/school/file" element={
                    <SchoolRoute>
                      <SchoolFilePage />
                    </SchoolRoute>
                  } />

                  {/* All Documents CRM Page */}
                  <Route path="/all-documents" element={
                    <SchoolRoute>
                      <AllDocumentsPage />
                    </SchoolRoute>
                  } />
                  <Route path="/person-file/:type/:personId" element={
                    <SchoolRoute>
                      <PersonFilePage />
                    </SchoolRoute>
                  } />

                  {/* Roster Import Review */}
                  <Route path="/roster/import/:jobId/review" element={
                    <SchoolRoute>
                      <ImportReviewPage />
                    </SchoolRoute>
                  } />

                  {/* Director Dashboard */}
                  <Route path="/director-dashboard" element={
                    <DirectorRoute>
                      <DirectorDashboard />
                    </DirectorRoute>
                  } />

                  {/* Compliance Center Routes */}
                  <Route path="/compliance-center" element={
                    <SchoolRoute>
                      <ComplianceCenterLanding />
                    </SchoolRoute>
                  } />
                  <Route path="/compliance-center/doh" element={
                    <SchoolRoute>
                      <DOHSection />
                    </SchoolRoute>
                  } />
                  <Route path="/compliance-center/facility" element={
                    <SchoolRoute>
                      <FacilitySafetySection />
                    </SchoolRoute>
                  } />
                  <Route path="/compliance-center/certifications" element={
                    <SchoolRoute>
                      <CertificationsSection />
                    </SchoolRoute>
                  } />
                  
                  {/* Legacy compliance routes - redirect to new paths */}
                  <Route path="/compliance" element={<Navigate to="/compliance-center" replace />} />
                  <Route path="/compliance-dashboard" element={
                    <SchoolRoute>
                      <ComplianceDashboard />
                    </SchoolRoute>
                  } />
                  <Route path="/doh-compliance" element={
                    <SchoolRoute>
                      <DOHCompliance />
                    </SchoolRoute>
                  } />

                  {/* Teacher Eligibility Portal */}
                  <Route path="/eligibility" element={
                    <SchoolRoute>
                      <EligibilityPortal />
                    </SchoolRoute>
                  } />
                  <Route path="/eligibility/:teacherId" element={
                    <SchoolRoute>
                      <TeacherEligibilityProfile />
                    </SchoolRoute>
                  } />

                  {/* School Admin Management Routes */}
                  <Route path="/admin/required-documents" element={
                    <SchoolRoute>
                      <RequiredDocumentsPage />
                    </SchoolRoute>
                  } />
                  <Route path="/admin/student/:studentId" element={
                    <SchoolRoute>
                      <StudentDetailPage />
                    </SchoolRoute>
                  } />
                  <Route path="/admin/staff-requirements" element={
                    <SchoolRoute>
                      <StaffRequiredDocumentsPage />
                    </SchoolRoute>
                  } />
                  <Route
                    path="/admin/staff-required-documents"
                    element={<Navigate to="/admin/staff-requirements" replace />}
                  />
                  <Route path="/admin/teacher/:teacherId" element={
                    <SchoolRoute>
                      <TeacherDetailPage />
                    </SchoolRoute>
                  } />
                  <Route path="/admin/messages" element={
                    <SchoolRoute>
                      <MessageCenter />
                    </SchoolRoute>
                  } />

                  {/* Platform Admin Routes (nested under shared layout) */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminLayout />
                      </AdminRoute>
                    }
                  >
                    <Route index element={<AdminOverview />} />
                    <Route path="students" element={<AdminStudents />} />
                    <Route path="parents" element={<AdminParents />} />
                    <Route path="staff" element={<AdminTeachers />} />
                    <Route path="schools" element={<AdminSchools />} />
                    <Route path="directors" element={<AdminDirectors />} />
                    <Route path="documents" element={<AdminDocumentsPage />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                  <Route path="/admin/audit-logs" element={
                    <AdminRoute>
                      <AuditEventsPage />
                    </AdminRoute>
                  } />
                  <Route path="/admin/school/:schoolId" element={
                    <AdminRoute>
                      <SchoolDetailPage />
                    </AdminRoute>
                  } />
                  <Route path="/admin/reminders" element={
                    <AdminRoute>
                      <ReminderManagement />
                    </AdminRoute>
                  } />
                  <Route path="/admin/privacy-settings" element={
                    <AdminRoute>
                      <PrivacyPolicySettings />
                    </AdminRoute>
                  } />
                  {/* In-layout access denied */}
                  <Route path="/access-denied" element={<NotAuthorizedInLayout />} />
                  
                  {/* Catch-all 404 inside the app shell (sidebar visible) */}
                  <Route path="*" element={<NotFoundInLayout />} />
                </Route>

                {/* ==================== CATCH-ALL (public 404) ==================== */}
                <Route path="*" element={<NotFound />} />
              </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
);

export default App;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Shield, Building2, Users, Briefcase, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo-nobg.png";

interface HeaderProps {
  hideParentPortal?: boolean;
}

const Header = ({
  hideParentPortal = false
}: HeaderProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    isAdmin,
    isStaff,
    isAdminOrStaff,
    isDirector,
    isSchool,
    isParent,
    getRoleDisplayName
  } = useUserRole();
  const selectedSchool = null as any;
  const availableSchools = [] as any[];
  const setSelectedSchool = (_s: any) => { };
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showSchoolSwitcher = isParent && availableSchools.length > 1;
  const getDashboardInfo = () => {
    if (isAdminOrStaff) {
      return {
        path: '/admin',
        label: 'Admin Dashboard',
        icon: Shield
      };
    }
    if (isDirector) {
      return {
        path: '/director-dashboard',
        label: 'Director Dashboard',
        icon: Briefcase
      };
    }
    if (isSchool) {
      return {
        path: '/school-dashboard',
        label: 'School Dashboard',
        icon: Building2
      };
    }
    return {
      path: '/dashboard',
      label: 'Parent Dashboard',
      icon: Users
    };
  };
  const dashboardInfo = getDashboardInfo();
  const DashboardIcon = dashboardInfo.icon;
  
  return <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-sm border-b border-border/40 shadow-xs">
    <div className="container flex h-16 items-center justify-between">
      <Link to="/" className="flex items-center">
        <img alt="Compli-ed" src={logo} style={{
          mixBlendMode: 'multiply'
        }} className="h-16 md:h-15 w-auto border-none object-fill" />
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {!user ? <>
          <Link to="/#features" className="text-sm transition-colors shadow-none font-semibold text-brandnavy">
            Features
          </Link>
          <Link to="/pricing" className="text-sm transition-colors text-brandnavy font-semibold">
            Pricing
          </Link>
          <Link to="/about" className="text-sm transition-colors text-brandnavy font-semibold">
            About
          </Link>
          {!hideParentPortal && <div className="flex items-center gap-3 ml-4">
            <Button variant="ghost" onClick={() => navigate('/auth?tab=signin')} className="text-brandnavy font-medium">
              Sign In
            </Button>
            <Button onClick={() => navigate('/institution-auth')}>
              Apply Now
            </Button>
          </div>}
        </> : <>
          <Link to={dashboardInfo.path} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <DashboardIcon className="h-4 w-4" />
            {dashboardInfo.label}
          </Link>

          {(isDirector || isSchool || isAdmin || isStaff) && (
            <Link to="/compliance-center" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Compliance Center
            </Link>
          )}

          {showSchoolSwitcher && selectedSchool && <Select value={selectedSchool.id} onValueChange={value => {
            const school = availableSchools.find(s => s.id === value);
            if (school) setSelectedSchool(school);
          }}>
            <SelectTrigger className="w-[180px] h-9 bg-card">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card">
              {availableSchools.map(school => <SelectItem key={school.id} value={school.id}>
                {school.name}
              </SelectItem>)}
            </SelectContent>
          </Select>}

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {(user as any)?.name || (user as any)?.email}
              </p>
              <Badge variant="secondary" className="text-xs">
                {getRoleDisplayName()}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </>}
      </nav>

      {/* Mobile Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] bg-card">
          <nav className="flex flex-col gap-4 mt-8">
            {!user ? <>
              <Link to="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                About
              </Link>
              {!hideParentPortal && <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button variant="outline" className="w-full" onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/auth?tab=signin');
                }}>
                  Sign In
                </Button>
                <Button className="w-full" onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/institution-auth');
                }}>
                  Apply Now
                </Button>
              </div>}
            </> : <>
              <Link to={dashboardInfo.path} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <DashboardIcon className="h-4 w-4" />
                {dashboardInfo.label}
              </Link>

              {(isDirector || isSchool || isAdmin || isStaff) && (
                <Link to="/compliance-center" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <ClipboardCheck className="h-4 w-4" />
                  Compliance Center
                </Link>
              )}

              {showSchoolSwitcher && selectedSchool && <div className="py-2">
                <Select value={selectedSchool.id} onValueChange={value => {
                  const school = availableSchools.find(s => s.id === value);
                  if (school) setSelectedSchool(school);
                }}>
                  <SelectTrigger className="w-full bg-card">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {availableSchools.map(school => <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {(user as any)?.name || (user as any)?.email}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {getRoleDisplayName()}
                    </Badge>
                  </div>
                  <ThemeToggle />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </>}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  </header>;
};

export default Header;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import DocumentReviewDialog from '@/components/admin/DocumentReviewDialog';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, FileText, Search, User, Eye, CheckCircle, XCircle, Filter } from 'lucide-react';
/**
 * PendingDocuments - School document review page
 * 
 * SCHOOL-ONLY PAGE: Only role='school', 'school_staff', 'admin', or 'director' can access.
 * Parents are redirected to their dashboard.
 */

// Loading skeleton component
const PageSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-8 mx-auto rounded-full" />
              <Skeleton className="h-6 w-12 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

interface Document {
  id: string;
  status: string;
  category: string;
  file_name: string;
  created_at: string;
  expiration_date: string | null;
  school_id: string;
  students?: {
    first_name: string;
    last_name: string;
    grade_level?: string | null;
  } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All Documents' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const PendingDocuments = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    canManageSchool,
    isParent,
    schoolId,
    branchId,
    isBranchDirector,
    loading: roleLoading,
  } = useUserRole();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Role-based access control
  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Not authenticated - redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // Parents should not see this page - redirect to parent dashboard
    if (isParent) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Only school-related roles can access
    if (!canManageSchool) {
      navigate('/not-authorized', { replace: true });
      return;
    }

    if (!schoolId) {
      navigate('/school-register');
      return;
    }

    fetchSchoolAndDocuments();
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate, schoolId]);

  // Apply filters whenever documents or filter state changes
  useEffect(() => {
    let filtered = [...documents];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.category === categoryFilter);
    }

    // Search query (student name or file name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => {
        const studentName = doc.students 
          ? `${doc.students.first_name} ${doc.students.last_name}`.toLowerCase()
          : '';
        const fileName = doc.file_name.toLowerCase();
        return studentName.includes(query) || fileName.includes(query);
      });
    }

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, statusFilter, categoryFilter]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return <PageSkeleton />;
  }

  // Don't render if not authorized
  if (!user || isParent || !canManageSchool) {
    return <PageSkeleton />;
  }

  const fetchSchoolAndDocuments = async () => {
    if (!user || !schoolId) return;

    try {
      const data = await documentService.search({
        schoolId,
        ...(branchId && isBranchDirector ? { branchId } : {}),
      });
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading documents',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (doc: Document) => {
    setSelectedDocument(doc);
    setReviewDialogOpen(true);
  };

  const handleView = (doc: Document) => {
    setViewDocument(doc);
    setViewDialogOpen(true);
  };

  const handleReviewComplete = () => {
    fetchSchoolAndDocuments();
    setReviewDialogOpen(false);
    setSelectedDocument(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: typeof Clock }> = {
      pending: { className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
      approved: { className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
      rejected: { className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`capitalize ${config.className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getCategoryOptions = () => {
    const categories = new Set(documents.map(doc => doc.category));
    return [
      { value: 'all', label: 'All Categories' },
      ...Array.from(categories).map(cat => ({
        value: cat,
        label: CATEGORY_LABELS[cat] || cat,
      })),
    ];
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Document Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve student documents submitted by parents
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{documents.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingCount > 0 ? 'border-amber-200 bg-amber-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{approvedCount}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{rejectedCount}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {getCategoryOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            Documents ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 px-6">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'pending' 
                  ? 'No documents are currently pending review.'
                  : 'Try adjusting your filters to see more results.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-medium">Student</TableHead>
                    <TableHead className="font-medium">Document Type</TableHead>
                    <TableHead className="font-medium">Uploaded</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Expiration</TableHead>
                    <TableHead className="text-right font-medium w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {doc.students 
                                ? `${doc.students.first_name} ${doc.students.last_name}`
                                : 'Unknown Student'}
                            </div>
                            {doc.students?.grade_level && (
                              <div className="text-xs text-muted-foreground">
                                {doc.students.grade_level}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {CATEGORY_LABELS[doc.category] || doc.category}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]" title={doc.file_name}>
                            {doc.file_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        {doc.expiration_date ? (
                          <span className="text-sm">
                            {new Date(doc.expiration_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleView(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Document</TooltipContent>
                          </Tooltip>
                          {doc.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleReview(doc)}
                            >
                              Review
                            </Button>
                          )}
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

      {/* Review Dialog */}
      <DocumentReviewDialog
        document={selectedDocument}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onReviewComplete={handleReviewComplete}
      />

      {/* View Dialog */}
      <DocumentViewerModal
        document={viewDocument}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
};

export default PendingDocuments;

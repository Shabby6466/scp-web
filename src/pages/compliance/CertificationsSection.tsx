import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useCertifications, CertificationRecord } from '@/hooks/useCertifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Award,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, differenceInDays, parseISO } from 'date-fns';

const CertificationsSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schoolId } = useUserRole();
  const {
    certificationTypes,
    records,
    stats,
    loading,
    createRecord,
    updateRecord,
    deleteRecord,
    refresh,
  } = useCertifications(schoolId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [appliesFilter, setAppliesFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  // Form state for creating new certification
  const [formData, setFormData] = useState({
    certification_type_id: '',
    applies_to: 'staff' as 'staff' | 'vendor' | 'facility' | 'other',
    subject_name: '',
    issued_date: '',
    expiry_date: '',
    notes: '',
  });

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !searchQuery ||
      record.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.certification_type?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesApplies = appliesFilter === 'all' || record.applies_to === appliesFilter;
    return matchesSearch && matchesStatus && matchesApplies;
  });

  const getStatusBadge = (record: CertificationRecord) => {
    const now = new Date();
    if (!record.expiry_date) {
      return <Badge variant="outline">No Expiry</Badge>;
    }
    const expiryDate = parseISO(record.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, now);

    if (daysUntilExpiry < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    if (daysUntilExpiry <= 30) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expiring ({daysUntilExpiry}d)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  const getAppliesLabel = (applies: string) => {
    switch (applies) {
      case 'staff':
        return 'Staff';
      case 'vendor':
        return 'Vendor';
      case 'facility':
        return 'Facility';
      case 'other':
        return 'Other';
      default:
        return applies;
    }
  };

  const handleCreateSubmit = async () => {
    if (!schoolId || !user) return;

    await createRecord({
      school_id: schoolId,
      certification_type_id: formData.certification_type_id || null,
      applies_to: formData.applies_to,
      subject_id: null,
      subject_name: formData.subject_name,
      issued_date: formData.issued_date || null,
      expiry_date: formData.expiry_date || null,
      status: 'active',
      owner_user_id: user.id,
      notes: formData.notes || null,
    });

    setFormData({
      certification_type_id: '',
      applies_to: 'staff',
      subject_name: '',
      issued_date: '',
      expiry_date: '',
      notes: '',
    });
    setCreateOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this certification record?')) {
      await deleteRecord(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => navigate('/compliance-center')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Compliance Center
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="secondary">Certifications & Licenses</Badge>
            </div>
            <h1 className="text-4xl font-display font-bold mb-2">
              Certifications & Licenses
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Track staff certifications, vendor credentials, and facility permits. Get notified
              before expiration dates and maintain evidence for audits.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <div className="text-3xl font-bold">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
                    </div>
                  </div>
                  <Award className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <div className="text-3xl font-bold text-green-600">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.active}
                    </div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={stats.expiring > 0 ? 'border-yellow-200 dark:border-yellow-900' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expiring Soon</p>
                    <div
                      className={`text-3xl font-bold ${
                        stats.expiring > 0 ? 'text-yellow-600' : ''
                      }`}
                    >
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.expiring}
                    </div>
                  </div>
                  <Clock
                    className={`h-8 w-8 ${
                      stats.expiring > 0 ? 'text-yellow-500' : 'text-muted-foreground'
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className={stats.expired > 0 ? 'border-red-200 dark:border-red-900' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expired</p>
                    <div
                      className={`text-3xl font-bold ${stats.expired > 0 ? 'text-red-600' : ''}`}
                    >
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.expired}
                    </div>
                  </div>
                  <AlertTriangle
                    className={`h-8 w-8 ${
                      stats.expired > 0 ? 'text-red-500' : 'text-muted-foreground'
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search certifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={appliesFilter} onValueChange={setAppliesFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Applies To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="facility">Facility</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Certification</DialogTitle>
                      <DialogDescription>
                        Track a new certification or license for your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Certification Type</Label>
                        <Select
                          value={formData.certification_type_id}
                          onValueChange={(v) =>
                            setFormData({ ...formData, certification_type_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                          <SelectContent>
                            {certificationTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {certificationTypes.length === 0 && !loading && (
                          <p className="text-xs text-muted-foreground">
                            No types are defined for your school yet. A director or admin can create
                            them with{' '}
                            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                              POST /api/certification-types
                            </code>{' '}
                            (body:{' '}
                            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                              schoolId
                            </code>
                            ,{' '}
                            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">name</code>
                            , optional description / defaultValidityMonths). Then refresh this page.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Applies To</Label>
                        <Select
                          value={formData.applies_to}
                          onValueChange={(v: any) =>
                            setFormData({ ...formData, applies_to: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
                            <SelectItem value="facility">Facility</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subject Name</Label>
                        <Input
                          placeholder="e.g., John Smith, ABC Catering, Main Building"
                          value={formData.subject_name}
                          onChange={(e) =>
                            setFormData({ ...formData, subject_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Issued Date</Label>
                          <Input
                            type="date"
                            value={formData.issued_date}
                            onChange={(e) =>
                              setFormData({ ...formData, issued_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input
                            type="date"
                            value={formData.expiry_date}
                            onChange={(e) =>
                              setFormData({ ...formData, expiry_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Any additional notes..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSubmit}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Certifications Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {records.length === 0
                      ? 'Add your first certification to start tracking.'
                      : 'No certifications match your current filters.'}
                  </p>
                  {records.length === 0 && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certification</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.certification_type?.name || 'Custom'}
                        </TableCell>
                        <TableCell>{record.subject_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getAppliesLabel(record.applies_to)}</Badge>
                        </TableCell>
                        <TableCell>
                          {record.expiry_date
                            ? format(parseISO(record.expiry_date), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{record.evidence_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Add Evidence
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(record.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
    </div>
  );
};

export default CertificationsSection;

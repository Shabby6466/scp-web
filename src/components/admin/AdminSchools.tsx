import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, School, MapPin, Mail, Phone, Search, ExternalLink, Eye, Send, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { schoolService } from '@/services/schoolService';
import { unwrapList } from '@/lib/api';
import { invitationService } from '@/services/invitationService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

/** Nest / TypeORM returns camelCase; keep snake_case fields the list UI expects. */
function normalizeSchoolRow(raw: Record<string, unknown>) {
  const r = raw as Record<string, any>;
  const created = r.createdAt ?? r.created_at;
  const approved = r.approvedAt ?? r.approved_at;
  return {
    ...r,
    is_approved: !!(r.isApproved ?? r.is_approved),
    zip_code: r.zipCode ?? r.zip_code ?? '',
    created_at: created != null ? String(created) : '',
    approved_at: approved != null ? String(approved) : null,
    license_number: r.licenseNumber ?? r.license_number ?? null,
    certification_number: r.certificationNumber ?? r.certification_number ?? null,
    total_capacity: r.totalCapacity ?? r.total_capacity ?? null,
    min_age: r.minAge ?? r.min_age ?? null,
    max_age: r.maxAge ?? r.max_age ?? null,
  };
}

function safeLocaleDateLabel(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const d = new Date(raw as string);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

const AdminSchools = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<any[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [schools, statusFilter, searchQuery]);

  const fetchSchools = async () => {
    try {
      const data = await schoolService.list();
      const list = unwrapList<Record<string, unknown>>(data);
      setSchools(list.map(normalizeSchoolRow));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load schools',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...schools];

    if (statusFilter === 'pending') {
      filtered = filtered.filter(s => !s.is_approved);
    } else if (statusFilter === 'approved') {
      filtered = filtered.filter(s => s.is_approved);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.city.toLowerCase().includes(query)
      );
    }

    setFilteredSchools(filtered);
  };

  const approveSchool = async (schoolId: string) => {
    try {
      await schoolService.approve(schoolId);

      toast({
        title: 'School Approved',
        description: 'The school has been approved. You can now send an admin invitation to grant access.',
      });

      await fetchSchools();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: error.message,
      });
    }
  };

  const sendSchoolAdminInvitation = async (school: any) => {
    if (!user) return;
    
    try {
      await invitationService.send({
        schoolId: school.id,
        email: school.email,
        role: 'SCHOOL_ADMIN',
      });

      toast({
        title: 'Invitation Sent',
        description: `Admin invitation has been sent to ${school.email}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send invitation',
        description: error.message,
      });
    }
  };

  const rejectSchool = async (schoolId: string) => {
    try {
      await schoolService.update(schoolId, {
        isApproved: false,
        approvedAt: null,
      });

      toast({
        title: 'School Rejected',
        description: 'The school has been rejected.',
        variant: 'destructive',
      });

      await fetchSchools();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Rejection failed',
        description: error.message,
      });
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await schoolService.create({
        ...newSchool,
        is_approved: true, // Manual creation by Platform Admin is pre-approved
        approved_at: new Date().toISOString(),
      });

      toast({
        title: 'School Created',
        description: 'New school has been created and pre-approved.',
      });

      setIsAddDialogOpen(false);
      setNewSchool({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
      });
      await fetchSchools();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation failed',
        description: error.message,
      });
    }
  };

  const stats = {
    total: schools.length,
    pending: schools.filter(s => !s.is_approved).length,
    approved: schools.filter(s => s.is_approved).length,
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Loading schools...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">School Management</h2>
          <p className="text-muted-foreground">
            Review and approve school registrations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Manually register and approve a new school in the platform.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSchool} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">School Name *</Label>
                  <Input 
                    id="name" 
                    value={newSchool.name} 
                    onChange={e => setNewSchool({...newSchool, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={newSchool.email} 
                    onChange={e => setNewSchool({...newSchool, email: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input 
                  id="phone" 
                  value={newSchool.phone} 
                  onChange={e => setNewSchool({...newSchool, phone: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input 
                  id="address" 
                  value={newSchool.address} 
                  onChange={e => setNewSchool({...newSchool, address: e.target.value})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input 
                    id="city" 
                    value={newSchool.city} 
                    onChange={e => setNewSchool({...newSchool, city: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input 
                    id="state" 
                    value={newSchool.state} 
                    onChange={e => setNewSchool({...newSchool, state: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input 
                    id="zip" 
                    value={newSchool.zip_code} 
                    onChange={e => setNewSchool({...newSchool, zip_code: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create & Approve</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Schools</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schools List */}
      {filteredSchools.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={School}
              title="No schools found"
              description={searchQuery ? "Try adjusting your search filters" : "Schools will appear here once they register"}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSchools.map((school) => (
            <Card key={school.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <School className="h-5 w-5" />
                      <CardTitle className="text-xl">{school.name}</CardTitle>
                      <Badge variant={school.is_approved ? 'default' : 'secondary'}>
                        {school.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{school.address}, {school.city}, {school.state} {school.zip_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{school.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{school.phone}</span>
                  </div>
                  {school.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={school.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>

                {school.license_number && (
                  <div className="text-sm">
                    <span className="font-medium">License:</span> {school.license_number}
                  </div>
                )}

                {school.total_capacity && (
                  <div className="text-sm">
                    <span className="font-medium">Capacity:</span> {school.total_capacity} students
                    {school.min_age && school.max_age && (
                      <span className="ml-2">| Ages {school.min_age}-{school.max_age}</span>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Registered: {safeLocaleDateLabel(school.created_at)}
                </div>

                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/admin/school/${school.id}`)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                  {!school.is_approved ? (
                    <>
                      <Button
                        onClick={() => approveSchool(school.id)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => rejectSchool(school.id)}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => sendSchoolAdminInvitation(school)}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Send Admin Invite
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => rejectSchool(school.id)}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Revoke Approval
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSchools;

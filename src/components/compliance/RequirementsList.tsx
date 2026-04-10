import { useState } from 'react';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  MoreHorizontal, 
  CheckCircle2, 
  FileText, 
  Trash2, 
  Edit, 
  Clock,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { ComplianceRequirement, useComplianceFramework } from '@/hooks/useComplianceFramework';
import RequirementDetailDrawer from './RequirementDetailDrawer';
import { useUserRole } from '@/hooks/useUserRole';

interface RequirementsListProps {
  requirements: ComplianceRequirement[];
  onRefresh: () => void;
}

const RequirementsList = ({ requirements, onRefresh }: RequirementsListProps) => {
  const { schoolId } = useUserRole();
  const { markRequirementComplete, deleteRequirement } = useComplianceFramework(schoolId);
  
  const [selectedReq, setSelectedReq] = useState<ComplianceRequirement | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (req: ComplianceRequirement) => {
    const status = req.status;
    const dueDate = req.next_due_date ? new Date(req.next_due_date) : null;
    
    // Check if overdue
    if (dueDate && isPast(dueDate) && status !== 'complete' && status !== 'not_applicable') {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    // Check if due soon (within 30 days)
    if (dueDate && isWithinInterval(dueDate, { start: new Date(), end: addDays(new Date(), 30) }) && status !== 'complete') {
      return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">Due Soon</Badge>;
    }

    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Complete</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'not_applicable':
        return <Badge variant="outline" className="text-muted-foreground">N/A</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High Risk</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">Medium</Badge>;
      default:
        return null;
    }
  };

  const filteredRequirements = requirements
    .filter(req => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'overdue') {
        const dueDate = req.next_due_date ? new Date(req.next_due_date) : null;
        return dueDate && isPast(dueDate) && req.status !== 'complete';
      }
      if (statusFilter === 'due_soon') {
        const dueDate = req.next_due_date ? new Date(req.next_due_date) : null;
        return dueDate && isWithinInterval(dueDate, { start: new Date(), end: addDays(new Date(), 30) }) && req.status !== 'complete';
      }
      return req.status === statusFilter;
    })
    .filter(req => 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleMarkComplete = async (req: ComplianceRequirement) => {
    await markRequirementComplete(req.id);
    onRefresh();
  };

  const handleDelete = async (req: ComplianceRequirement) => {
    if (confirm('Are you sure you want to delete this requirement?')) {
      await deleteRequirement(req.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="due_soon">Due Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requirements List */}
      {filteredRequirements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No requirements found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRequirements.map((req) => (
            <Card 
              key={req.id} 
              className="hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => setSelectedReq(req)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={req.status === 'complete'}
                      onCheckedChange={(checked) => {
                        if (checked) handleMarkComplete(req);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium truncate">{req.title}</h4>
                        {getRiskBadge(req.risk_level)}
                      </div>
                      {req.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {req.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        {getStatusBadge(req)}
                        {req.next_due_date && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Due {format(new Date(req.next_due_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {(req.evidence_count ?? 0) > 0 && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {req.evidence_count} evidence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleMarkComplete(req);
                      }}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReq(req);
                      }}>
                        <FileText className="h-4 w-4 mr-2" />
                        Add Evidence
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(req);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RequirementDetailDrawer
        requirement={selectedReq}
        open={!!selectedReq}
        onOpenChange={(open) => !open && setSelectedReq(null)}
        onRefresh={onRefresh}
      />
    </div>
  );
};

export default RequirementsList;

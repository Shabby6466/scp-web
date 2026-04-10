import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  FileUp,
  UserPlus,
  Plus,
  MapPin,
} from 'lucide-react';

interface Branch {
  id: string;
  branch_name: string;
}

interface TopActionBarProps {
  schoolName: string;
  schoolId?: string;
  branches?: Branch[];
  selectedBranchId?: string | null;
  onBranchChange?: (branchId: string | null) => void;
  onImportRoster: () => void;
  onInviteParent: () => void;
  onUploadDocument?: () => void;
  onCreateRequirement?: () => void;
  isApproved?: boolean;
  isDirector?: boolean;
  branchName?: string;
  branchId?: string | null;
}

export function TopActionBar({
  schoolName,
  schoolId,
  branches = [],
  selectedBranchId,
  onBranchChange,
  onImportRoster,
  onInviteParent,
  onUploadDocument,
  onCreateRequirement,
  isApproved = true,
  isDirector = false,
  branchName,
  branchId,
}: TopActionBarProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 pb-4 border-b border-border/40">
      {/* School Info - Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="font-semibold text-base truncate text-foreground">{schoolName}</h1>
          {isDirector && branchName ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{branchName}</span>
              <Badge variant="secondary" className="ml-1">Director</Badge>
            </div>
          ) : branches.length > 1 && onBranchChange ? (
            <Select
              value={selectedBranchId || 'all'}
              onValueChange={(v) => onBranchChange(v === 'all' ? null : v)}
            >
              <SelectTrigger className="h-6 text-xs border-0 p-0 bg-transparent shadow-none focus:ring-0 text-muted-foreground">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.branch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      {/* Spacer for layout balance */}
      <div className="flex-1" />

      {/* CTAs - Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={onImportRoster}
          disabled={!isApproved}
          className="gap-1.5"
        >
          <FileUp className="h-4 w-4" />
          <span className="hidden sm:inline">Import</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onInviteParent}
          disabled={!isApproved}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Invite</span>
        </Button>
        {!isDirector && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/admin/required-documents')}
            disabled={!isApproved}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Requirements</span>
          </Button>
        )}
      </div>
    </div>
  );
}

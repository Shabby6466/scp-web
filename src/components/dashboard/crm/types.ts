export interface UrgentAction {
  id: string;
  label: string;
  count: number;
  type: 'overdue' | 'due-soon' | 'action-needed';
  ctaLabel: string;
  route: string;
  icon?: string;
  priorityScore?: number;
  daysUntilDue?: number;
  blocksCompliance?: boolean;
  isLicensingRelated?: boolean;
}

export interface PendingDocument {
  id: string;
  entityName: string;
  entityType: 'student' | 'staff';
  documentType: string;
  status: 'pending' | 'missing' | 'rejected';
  studentId?: string;
  teacherId?: string;
}

export interface InviteStats {
  totalInvited: number;
  accepted: number;
  pending: number;
  notInvited: number;
  last7DaysActivity: number;
}

export interface ComplianceSnapshot {
  category: string;
  percentage: number;
  overdueCount: number;
  dueSoonCount: number;
}

export interface DirectoryStats {
  students: {
    total: number;
    missingDocs: number;
  };
  parents: {
    total: number;
    notInvited: number;
  };
  staff: {
    total: number;
    expiring: number;
  };
  documents: {
    total: number;
    pending: number;
  };
}

// Work Inbox types
export type InboxItemType = 'document' | 'invite' | 'requirement' | 'expiring' | 'missing';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  entityName: string;
  entityType: 'student' | 'staff' | 'parent' | 'facility';
  description: string;
  dueDate?: string;
  daysOverdue?: number;
  priorityScore: number;
  ctaLabel: string;
  route: string;
  entityId?: string;
}

// Search result types
export interface SearchResult {
  id: string;
  type: 'student' | 'parent' | 'staff' | 'document';
  name: string;
  subtitle?: string;
  route: string;
}

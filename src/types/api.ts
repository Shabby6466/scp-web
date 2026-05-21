// ── Enums (string unions matching Prisma schema) ─────────────────────

export type UserRole =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'BRANCH_DIRECTOR'
  | 'TEACHER'
  | 'PARENT'
  | 'STUDENT';

export type StaffPosition = 'LEAD_TEACHER' | 'ASSISTANT_TEACHER' | 'AIDE' | 'SUBSTITUTE' | 'OTHER';

export type RenewalPeriod = 'NONE' | 'ANNUAL' | 'BIENNIAL';

/** Per-user requirement task status (backend requirement_status_enum). */
export type RequirementStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WAIVED';

/** Uploaded document review status (backend document_review_status_enum). */
export type DocumentReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type DocumentStatus = DocumentReviewStatus | 'EXPIRED';

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export type RequirementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** @deprecated legacy assignment due type */
export type DueType = 'FIXED' | 'RELATIVE';

// ── Auth ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  authorities: UserRole[];
  schoolId: string | null;
  branchId: string | null;
  staffPosition: string | null;
  staffClearanceActive: boolean;
  emailVerifiedAt: string | null;
  parentProfile?: {
    phone: string | null;
    address: string | null;
    notes: string | null;
  } | null;
  parentLinks?: Array<{
    id: string;
    studentId: string;
    relation: string | null;
    isPrimary: boolean;
    student: {
      id: string;
      name: string | null;
      email: string;
      schoolId: string | null;
      branchId: string | null;
      studentProfile: StudentProfile | null;
    };
  }>;
  studentLinks?: Array<{
    id: string;
    parentId: string;
    relation: string | null;
    isPrimary: boolean;
    parent: {
      id: string;
      name: string | null;
      email: string;
      parentProfile: ParentProfile | null;
    };
  }>;
  directorProfile?: DirectorProfile | null;
  branchDirectorProfile?: BranchDirectorProfile | null;
  teacherProfile?: TeacherProfile | null;
  studentProfile?: StudentProfile | null;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

// ── Core org models ──────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  website?: string | null;
  licenseNumber?: string | null;
  certificationNumber?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  totalCapacity?: number | null;
  primaryColor?: string | null;
  logoUrl?: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  schoolId: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  totalCapacity?: number | null;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  authorities: UserRole[];
  schoolId: string | null;
  branchId: string | null;
  emailVerifiedAt: string | null;
  assignedById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Document models (schema redesign) ────────────────────────────────

export type DocumentTypeFieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select';
  required?: boolean;
  options?: string[];
};

export interface DocumentCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  schoolId: string | null;
  branchId: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentType {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  roles: UserRole[];
  renewalMonths: number | null;
  fields: DocumentTypeFieldDef[];
  requiresFile: boolean;
  sortOrder: number;
  schoolId: string | null;
  branchId: string | null;
  isActive: boolean;
  category?: DocumentCategory | null;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated legacy */
  isMandatory?: boolean;
  renewalPeriod?: RenewalPeriod;
  targetRole?: UserRole;
  kind?: string;
}

export interface Requirement {
  id: string;
  userId: string;
  documentTypeId: string;
  status: RequirementStatus;
  dueDate: string | null;
  nextDueDate: string | null;
  latestDocumentId: string | null;
  schoolId: string | null;
  branchId: string | null;
  documentType?: DocumentType;
  user?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  requirementId: string;
  documentTypeId: string;
  userId: string;
  fileName: string | null;
  s3Key: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  values: Record<string, unknown>;
  issuedAt: string | null;
  expiresAt: string | null;
  status: DocumentReviewStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  documentType?: DocumentType;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated legacy */
  ownerUserId?: string;
  uploadedById?: string;
  verifiedAt?: string | null;
}

/** @deprecated legacy assignment model */
export interface UserDocumentRequirement {
  id: string;
  assigneeUserId: string;
  documentTypeId: string;
  assignedByUserId: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  dueType: DueType;
  fixedDueAt: string | null;
  relativeDueDays: number | null;
  dueAt: string | null;
  assignedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Compliance models (legacy — inspection/compliance-requirement removed) ──

/** @deprecated use DocumentCategory */
export interface ComplianceCategory {
  id: string;
  name: string;
  description: string | null;
  schoolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string | null;
  inspectionTypeId: string;
  schoolId: string;
  status: string;
  frequency: string;
  riskLevel: string;
  dueDate: string | null;
  nextDueDate: string | null;
  lastCompletedAt: string | null;
  evidenceRequired: boolean;
  requiresReview: boolean;
  ownerUserId: string | null;
  tags: string[] | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  schoolId: string | null;
  isSystemDefault: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Certification models ─────────────────────────────────────────────

export interface CertificationType {
  id: string;
  name: string;
  appliesTo: string;
  description: string | null;
  defaultValidityMonths: number | null;
  evidenceTypes: string[] | null;
  tags: string[] | null;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationRecord {
  id: string;
  certificationTypeId: string | null;
  schoolId: string;
  appliesTo: string;
  subjectId: string | null;
  subjectName: string | null;
  ownerUserId: string | null;
  status: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Teacher models ───────────────────────────────────────────────────

export interface TeacherPosition {
  id: string;
  name: string;
  description: string | null;
  schoolId: string;
  isActive: boolean;
  minEducationLevel: string | null;
  minCredits: number | null;
  minEceCredits: number | null;
  minYearsExperience: number | null;
  requiresCda: boolean;
  requiresStateCert: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherEligibilityProfile {
  id: string;
  teacherId: string;
  schoolId: string;
  educationLevel: string | null;
  educationField: string | null;
  totalCredits: number | null;
  eceCredits: number | null;
  yearsExperience: number | null;
  resumePath: string | null;
  cdaCredential: boolean | null;
  stateCertification: string | null;
  firstAidCertified: boolean | null;
  cprCertified: boolean | null;
  languages: string[] | null;
  notes: string | null;
  aiAnalysis: Record<string, unknown> | null;
  aiAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Invitation model ─────────────────────────────────────────────────

export interface Invitation {
  id: string;
  email: string;
  schoolId: string;
  branchId: string | null;
  status: InvitationStatus;
  invitationToken: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdBy: string;
  createdAt: string;
}

// ── Audit model ──────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── Student / Parent models ──────────────────────────────────────────

export interface StudentParent {
  id: string;
  studentId: string;
  parentId: string;
  schoolId: string;
  relationshipType: string | null;
  isPrimaryContact: boolean;
  createdAt: string;
}

export interface ParentProfile {
  userId: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Role-specific profiles ───────────────────────────────────────────

export interface DirectorProfile {
  userId: string;
  officePhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDirectorProfile {
  userId: string;
  branchStartDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  userId: string;
  subjectArea: string | null;
  employeeCode: string | null;
  joiningDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  userId: string;
  rollNumber: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

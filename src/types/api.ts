// ── Enums (string unions matching Prisma schema) ─────────────────────

export type UserRole = 'ADMIN' | 'DIRECTOR' | 'BRANCH_DIRECTOR' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type StaffPosition = 'LEAD_TEACHER' | 'ASSISTANT_TEACHER' | 'AIDE' | 'SUBSTITUTE' | 'OTHER';

export type RenewalPeriod = 'NONE' | 'ANNUAL' | 'BIENNIAL';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export type RequirementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RequirementStatus = 'PENDING' | 'UPLOADED' | 'OVERDUE' | 'CANCELLED';

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

// ── Document models ──────────────────────────────────────────────────

export interface DocumentType {
  id: string;
  name: string;
  isMandatory: boolean;
  renewalPeriod: RenewalPeriod;
  sortOrder: number;
  schoolId: string | null;
  appliesToRoles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  ownerUserId: string;
  documentTypeId: string;
  uploadedById: string;
  requirementId: string | null;
  s3Key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  verifiedAt: string | null;
  expiresAt: string | null;
}

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

// ── Compliance models ────────────────────────────────────────────────

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

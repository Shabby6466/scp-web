import { useCallback, useEffect, useMemo, useState } from "react";
import { documentTypeService } from "@/services/documentTypeService";
import { branchService } from "@/services/branchService";
import { schoolService } from "@/services/schoolService";
import { unwrapList } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2, Plus, FileText } from "lucide-react";
import AddDocumentTypeWizard from "./AddDocumentTypeWizard";
import type { DocumentType } from "@/types/api";

export type DocumentRequirementTargetRole =
  | "STUDENT"
  | "TEACHER"
  | "PARENT"
  | "DIRECTOR"
  | "BRANCH_DIRECTOR";

type BranchOption = { id: string; name?: string; branchName?: string };
type SchoolOption = { id: string; name: string };

const NONE = "__none__";

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function normalizeDocRow(raw: unknown): DocumentType | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = toText(row.id);
  if (!id) return null;

  const catRaw = row.category;
  let category = null;
  if (catRaw && typeof catRaw === "object") {
    const c = catRaw as Record<string, unknown>;
    category = {
      id: toText(c.id ?? row.categoryId),
      name: toText(c.name),
      slug: toText(c.slug),
      description: toText(c.description) || null,
      sortOrder: Number(c.sortOrder ?? 0),
      schoolId: toText(c.schoolId) || null,
      branchId: toText(c.branchId) || null,
      isActive: Boolean(c.isActive ?? true),
    };
  }

  const rolesRaw = row.roles;
  const roles = Array.isArray(rolesRaw)
    ? (rolesRaw.map((r) => toText(r)).filter(Boolean) as DocumentType["roles"])
    : [];

  return {
    id,
    categoryId: toText(row.categoryId) || category?.id || "",
    name: toText(row.name),
    description: toText(row.description) || null,
    roles,
    renewalMonths:
      row.renewalMonths == null && row.renewal_months == null
        ? null
        : Number(row.renewalMonths ?? row.renewal_months),
    fields: Array.isArray(row.fields) ? (row.fields as DocumentType["fields"]) : [],
    requiresFile: row.requiresFile !== false && row.requires_file !== false,
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    schoolId: toText(row.schoolId ?? row.school_id) || null,
    branchId:
      row.branchId == null && row.branch_id == null
        ? null
        : toText(row.branchId ?? row.branch_id) || null,
    isActive: row.isActive !== false && row.is_active !== false,
    category,
  };
}

export interface DocumentTypeRequirementsPanelProps {
  targetRole: DocumentRequirementTargetRole;
  title: string;
  description: string;
  canConfigure: boolean;
  permissionMessage?: string;
  allowBranchScope?: boolean;
}

export default function DocumentTypeRequirementsPanel({
  targetRole,
  title,
  description,
  canConfigure,
  permissionMessage = "You don't have permission to manage these requirements.",
  allowBranchScope = targetRole === "STUDENT",
}: DocumentTypeRequirementsPanelProps) {
  const {
    canManageSchool,
    schoolId: userSchoolId,
    branchId: userBranchId,
    isAdmin,
    isDirector,
    isBranchDirector,
  } = useUserRole();

  const [adminSchoolId, setAdminSchoolId] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const effectiveSchoolId = isAdmin ? adminSchoolId : userSchoolId;

  const branchLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches) {
      m.set(b.id, (b.name ?? b.branchName ?? "Branch").trim());
    }
    return m;
  }, [branches]);

  const showBranchField =
    allowBranchScope && (isAdmin || isDirector) && !isBranchDirector;

  const [docs, setDocs] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentType | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const data = await schoolService.list();
        setSchools(unwrapList<SchoolOption>(data));
      } catch {
        toast.error("Failed to load schools");
      }
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!effectiveSchoolId || !allowBranchScope) {
      setBranches([]);
      return;
    }
    if (isBranchDirector && userBranchId) {
      (async () => {
        try {
          const b = await branchService.getById(userBranchId);
          setBranches([
            {
              id: b.id,
              name: b.name,
              branchName: (b as { branchName?: string }).branchName,
            },
          ]);
        } catch {
          setBranches([]);
        }
      })();
      return;
    }
    if (isBranchDirector) {
      setBranches([]);
      return;
    }
    (async () => {
      try {
        const branchRes = await branchService.listBySchool(effectiveSchoolId);
        setBranches(unwrapList<BranchOption>(branchRes));
      } catch {
        toast.error("Failed to load branches");
      }
    })();
  }, [effectiveSchoolId, allowBranchScope, isBranchDirector, userBranchId]);

  const loadDocuments = useCallback(async () => {
    if (!effectiveSchoolId || !canManageSchool || !canConfigure) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await documentTypeService.list({
        role: targetRole,
        schoolId: effectiveSchoolId,
      });
      const normalized = unwrapList<unknown>(data)
        .map(normalizeDocRow)
        .filter((row): row is DocumentType => row !== null);
      setDocs(normalized);
    } catch {
      toast.error("Failed to load requirements");
    }
    setLoading(false);
  }, [effectiveSchoolId, targetRole, canConfigure, canManageSchool]);

  useEffect(() => {
    if (!canManageSchool || !canConfigure) return;
    loadDocuments();
  }, [canManageSchool, canConfigure, loadDocuments]);

  const openNew = () => {
    setEditing(null);
    setWizardOpen(true);
  };

  const openEdit = (doc: DocumentType) => {
    setEditing(doc);
    setWizardOpen(true);
  };

  const confirmDelete = (doc: DocumentType) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const remove = async () => {
    if (!docToDelete) return;
    try {
      await documentTypeService.remove(docToDelete.id);
      setDocs((prev) => prev.filter((d) => d.id !== docToDelete.id));
      toast.success("Requirement deleted");
    } catch {
      toast.error("Failed to delete requirement");
    }
    setDeleteDialogOpen(false);
    setDocToDelete(null);
  };

  if (!canManageSchool) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to manage document requirements for your school.
      </div>
    );
  }

  if (!canConfigure) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {permissionMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isAdmin && (
            <div className="space-y-1 sm:min-w-[220px]">
              <Label className="text-xs text-muted-foreground">School</Label>
              <Select
                value={adminSchoolId ?? NONE}
                onValueChange={(v) => setAdminSchoolId(v === NONE ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Select school…</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={openNew}
            className="gap-2"
            disabled={isAdmin && !adminSchoolId}
          >
            <Plus className="h-4 w-4" />
            Add requirement
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border">
          <TableSkeleton rows={5} columns={6} />
        </div>
      ) : isAdmin && !effectiveSchoolId ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Choose a school</h3>
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No requirements yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add document types — they become per-user requirements automatically.
          </p>
          <Button onClick={openNew} className="mt-6 gap-2">
            <Plus className="h-4 w-4" />
            Add requirement
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="border-b">
                  <th className="py-3 px-4 text-left font-medium">Category</th>
                  <th className="py-3 px-4 text-left font-medium">Name</th>
                  {allowBranchScope && (
                    <th className="py-3 px-4 text-left font-medium">Scope</th>
                  )}
                  <th className="py-3 px-4 text-left font-medium">Renewal</th>
                  <th className="py-3 px-4 text-left font-medium">Fields</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <td className="py-3 px-4">{d.category?.name ?? "—"}</td>
                    <td className="py-3 px-4">{d.name}</td>
                    {allowBranchScope && (
                      <td className="py-3 px-4 text-muted-foreground">
                        {d.branchId ? (
                          <Badge variant="outline">
                            {branchLabelById.get(d.branchId) ?? "Branch"}
                          </Badge>
                        ) : (
                          "School-wide"
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      {d.renewalMonths ? `${d.renewalMonths} mo` : "None"}
                    </td>
                    <td className="py-3 px-4">{d.fields?.length ?? 0}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => confirmDelete(d)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {effectiveSchoolId && (
        <AddDocumentTypeWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          targetRole={targetRole}
          schoolId={effectiveSchoolId}
          editing={editing}
          branches={branches}
          showBranchField={showBranchField}
          onSaved={loadDocuments}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{docToDelete?.name}&quot;? Existing user requirements may remain until
              cleaned up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

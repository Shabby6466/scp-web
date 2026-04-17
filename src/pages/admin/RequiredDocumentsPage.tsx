import { useCallback, useEffect, useMemo, useState } from "react";
import { documentTypeService } from "@/services/documentTypeService";
import { branchService } from "@/services/branchService";
import { schoolService } from "@/services/schoolService";
import { complianceService } from "@/services/complianceService";
import { unwrapList } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash2, Plus, FileText } from "lucide-react";

type ComplianceCategoryOption = { id: string; name: string };
type BranchOption = { id: string; name?: string; branchName?: string };
type SchoolOption = { id: string; name: string };

type DocumentTypeRow = {
  id: string;
  name: string;
  isMandatory: boolean;
  renewalPeriod?: string;
  branchId?: string | null;
  schoolId?: string | null;
  category?: ComplianceCategoryOption | null;
};

const NONE = "__none__";

export default function RequiredDocumentsPage() {
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
  const [categories, setCategories] = useState<ComplianceCategoryOption[]>([]);

  const effectiveSchoolId = isAdmin ? adminSchoolId : userSchoolId;

  const branchLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches) {
      const label = (b.name ?? b.branchName ?? "Branch").trim();
      m.set(b.id, label);
    }
    return m;
  }, [branches]);

  const showBranchField = (isAdmin || isDirector) && !isBranchDirector;

  const [docs, setDocs] = useState<DocumentTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentTypeRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentTypeRow | null>(null);

  const [form, setForm] = useState({
    name: "",
    complianceCategoryId: "",
    branchId: "",
    isMandatory: true,
  });
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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
    if (!effectiveSchoolId) {
      setCategories([]);
      return;
    }
    (async () => {
      try {
        const catRes = await complianceService.listCategories(effectiveSchoolId);
        setCategories(unwrapList<ComplianceCategoryOption>(catRes));
      } catch {
        toast.error("Failed to load categories");
      }
    })();
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (!effectiveSchoolId) {
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
  }, [effectiveSchoolId, isBranchDirector, userBranchId]);

  const loadDocuments = useCallback(async () => {
    if (!effectiveSchoolId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await documentTypeService.list({
        targetRole: "STUDENT",
        schoolId: effectiveSchoolId,
      });
      setDocs(unwrapList<DocumentTypeRow>(data));
    } catch {
      toast.error("Failed to load required documents");
    }
    setLoading(false);
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (!canManageSchool) return;
    loadDocuments();
  }, [canManageSchool, loadDocuments]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      complianceCategoryId: "",
      branchId: "",
      isMandatory: true,
    });
    setOpen(true);
  };

  const openEdit = (doc: DocumentTypeRow) => {
    setEditing(doc);
    setForm({
      name: doc.name ?? "",
      complianceCategoryId: doc.category?.id ?? "",
      branchId: "",
      isMandatory: Boolean(doc.isMandatory),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.complianceCategoryId.trim()) {
      toast.error("Compliance category is required");
      return;
    }

    if (!effectiveSchoolId) {
      toast.error(
        isAdmin ? "Select a school first" : "No school associated with your account",
      );
      return;
    }

    try {
      if (editing) {
        const updated = await documentTypeService.update(editing.id, {
          name: form.name.trim(),
          isMandatory: form.isMandatory,
          renewalPeriod: "NONE",
          complianceCategoryId: form.complianceCategoryId.trim(),
        });
        toast.success("Document updated");
        await loadDocuments();
      } else {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          targetRole: "STUDENT",
          schoolId: effectiveSchoolId,
          renewalPeriod: "NONE",
          isMandatory: form.isMandatory,
          complianceCategoryId: form.complianceCategoryId.trim(),
        };
        if (showBranchField && form.branchId.trim()) {
          payload.branchId = form.branchId.trim();
        }
        await documentTypeService.create(payload);
        toast.success("Document added");
        await loadDocuments();
      }
      setOpen(false);
    } catch {
      toast.error("Failed to save document");
    }
  };

  const makeSlug = (name: string): string =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }
    if (!effectiveSchoolId) {
      toast.error(isAdmin ? "Select a school first" : "No school associated with your account");
      return;
    }
    const slug = makeSlug(name);
    if (!slug) {
      toast.error("Enter a valid category name");
      return;
    }

    setCreatingCategory(true);
    try {
      await complianceService.createCategory({
        name,
        slug,
        schoolId: effectiveSchoolId,
      });
      const catRes = await complianceService.listCategories(effectiveSchoolId);
      const next = unwrapList<ComplianceCategoryOption>(catRes);
      setCategories(next);
      const created = next.find((c) => makeSlug(c.name) === slug);
      if (created) {
        setForm((f) => ({ ...f, complianceCategoryId: created.id }));
      }
      setCreateCategoryOpen(false);
      setNewCategoryName("");
      toast.success("Compliance category created");
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const confirmDelete = (doc: DocumentTypeRow) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const remove = async () => {
    if (!docToDelete) return;
    try {
      await documentTypeService.remove(docToDelete.id);
      setDocs((prev) => prev.filter((d) => d.id !== docToDelete.id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
    setDeleteDialogOpen(false);
    setDocToDelete(null);
  };

  if (!canManageSchool) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don&apos;t have permission to manage student document requirements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-primary/20 text-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student document requirements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which documents families must submit for enrollment and compliance
          </p>
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
            Add Requirement
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border">
          <TableSkeleton rows={5} columns={5} />
        </div>
      ) : isAdmin && !effectiveSchoolId ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Choose a school</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a school above to view and manage student document requirements.
          </p>
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No requirements yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by adding your first document requirement.
          </p>
          <Button
            onClick={openNew}
            className="mt-6 gap-2"
            disabled={isAdmin && !adminSchoolId}
          >
            <Plus className="h-4 w-4" />
            Add Requirement
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
                <tr className="border-b">
                  <th className="py-3 px-4 text-left font-medium">Category</th>
                  <th className="py-3 px-4 text-left font-medium">Name</th>
                  <th className="py-3 px-4 text-left font-medium">Scope</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-right font-medium w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium">
                        {d.category?.name ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span title={d.name} className="block truncate max-w-[220px]">
                        {d.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {d.branchId ? (
                        <Badge variant="outline">
                          {branchLabelById.get(d.branchId) ?? "Branch"}
                        </Badge>
                      ) : (
                        <span>School-wide</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={d.isMandatory ? "default" : "secondary"}>
                        {d.isMandatory ? "Required" : "Optional"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => confirmDelete(d)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Requirement" : "Add Requirement"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details for this document requirement."
                : "Define a new document that parents must upload for students."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Universal Health Form"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Compliance category *</Label>
              <Select
                value={form.complianceCategoryId || NONE}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, complianceCategoryId: v === NONE ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Select category...</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    No compliance categories found for this school.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCreateCategoryOpen(true)}
                  >
                    Create category
                  </Button>
                </div>
              )}
            </div>
            {showBranchField && !editing && (
              <div className="space-y-2">
                <Label>Branch (optional)</Label>
                <Select
                  value={form.branchId || NONE}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, branchId: v === NONE ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="School-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>School-wide</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {(b.name ?? b.branchName ?? "Branch").trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave as school-wide or limit this requirement to one branch.
                </p>
              </div>
            )}
            {editing && editing.branchId && (
              <div className="rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Scope: </span>
                {editing.branchId ? (
                  <Badge variant="outline">
                    {branchLabelById.get(editing.branchId) ?? "Branch"}
                  </Badge>
                ) : (
                  <span>School-wide</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="mandatory" className="font-medium">Mandatory</Label>
                <p className="text-xs text-muted-foreground">Parents must upload this document</p>
              </div>
              <Switch
                id="mandatory"
                checked={form.isMandatory}
                onCheckedChange={(val) =>
                  setForm((f) => ({ ...f, isMandatory: Boolean(val) }))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>
                {editing ? "Save Changes" : "Add Requirement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create compliance category</DialogTitle>
            <DialogDescription>
              Add a category so requirements can be grouped in compliance views.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new-compliance-category">Category name *</Label>
              <Input
                id="new-compliance-category"
                placeholder="e.g. Health & Safety"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setCreateCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={createCategory} disabled={creatingCategory}>
                {creatingCategory ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the requirement &quot;{docToDelete?.name}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { documentTypeService } from "@/services/documentTypeService";
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
import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { unwrapList } from "@/lib/api";
import { complianceService } from "@/services/complianceService";
import { schoolService } from "@/services/schoolService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Users, FileText } from "lucide-react";

type ApiCategory = {
  id: string;
  name?: string;
  slug?: string;
};

type StaffRequiredDocument = {
  id: string;
  categoryId: string | null;
  category: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
};

type ComplianceCategoryOption = {
  id: string;
  name: string;
};
type SchoolOption = {
  id: string;
  name: string;
};

const NONE = "__none__";

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const categoryToText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const category = value as ApiCategory;
    return category.name ?? category.slug ?? "";
  }
  return "";
};

const normalizeDocument = (raw: unknown): StaffRequiredDocument | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = toText(row.id);
  if (!id) return null;

  return {
    id,
    categoryId: toText(row.categoryId) || null,
    category: categoryToText(row.category),
    name: toText(row.name),
    description: row.description == null ? null : toText(row.description),
    is_mandatory: Boolean(row.is_mandatory ?? row.isMandatory),
  };
};

export default function StaffRequiredDocumentsPage() {
  const { schoolId, isAdmin } = useUserRole();
  const [adminSchoolId, setAdminSchoolId] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [docs, setDocs] = useState<StaffRequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRequiredDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<StaffRequiredDocument | null>(null);
  const [categories, setCategories] = useState<ComplianceCategoryOption[]>([]);
  const { toast } = useToast();
  const effectiveSchoolId = isAdmin ? adminSchoolId : schoolId;

  const [form, setForm] = useState({
    complianceCategoryId: "",
    name: "",
    description: "",
    is_mandatory: true,
  });

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const data = await schoolService.list();
        setSchools(unwrapList<SchoolOption>(data));
      } catch {
        setSchools([]);
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
        const data = await complianceService.listCategories(effectiveSchoolId);
        setCategories(unwrapList<ComplianceCategoryOption>(data));
      } catch {
        setCategories([]);
      }
    })();
  }, [effectiveSchoolId]);

  const loadDocs = async () => {
    if (!effectiveSchoolId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await documentTypeService.list({ targetRole: 'TEACHER', schoolId: effectiveSchoolId });
      const normalized = unwrapList<unknown>(data)
        .map(normalizeDocument)
        .filter((row): row is StaffRequiredDocument => row !== null);
      setDocs(normalized);
    } catch {
      // silently fail
    }
    setLoading(false);
  };
  
  useEffect(() => {
    void loadDocs();
  }, [effectiveSchoolId]);

  const openNew = () => {
    setEditing(null);
    setForm({
      complianceCategoryId: "",
      name: "",
      description: "",
      is_mandatory: true,
    });
    setOpen(true);
  };

  const openEdit = (doc: StaffRequiredDocument) => {
    setEditing(doc);
    setForm({
      complianceCategoryId: doc.categoryId ?? "",
      name: doc.name ?? "",
      description: doc.description ?? "",
      is_mandatory: doc.is_mandatory,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!form.complianceCategoryId.trim()) {
      toast({
        title: "Validation Error",
        description: "Compliance category is required",
        variant: "destructive",
      });
      return;
    }

    if (!effectiveSchoolId) {
      toast({
        title: "Error",
        description: isAdmin ? "Select a school first" : "Could not determine your school",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      complianceCategoryId: form.complianceCategoryId.trim(),
      isMandatory: form.is_mandatory,
      schoolId: effectiveSchoolId,
      targetRole: 'TEACHER' as const,
      renewalPeriod: "NONE" as const,
    };

    try {
      if (editing) {
        await documentTypeService.update(editing.id, payload);
      } else {
        await documentTypeService.create(payload);
      }
      toast({
        title: "Success",
        description: `Staff requirement ${editing ? "updated" : "created"}`,
      });
      await loadDocs();
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not save requirement",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (doc: StaffRequiredDocument) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const remove = async () => {
    if (!docToDelete) return;
    try {
      await documentTypeService.remove(docToDelete.id);
      toast({ title: "Deleted", description: "Requirement removed" });
      loadDocs();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
    setDeleteDialogOpen(false);
    setDocToDelete(null);
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-primary/20 text-foreground">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff document requirements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which documents teachers and staff must submit for hiring and compliance
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
                  <SelectItem value={NONE}>Select school...</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={openNew} className="gap-2" disabled={isAdmin && !adminSchoolId}>
            <Plus className="h-4 w-4" />
            Add Requirement
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-lg border">
          <TableSkeleton rows={5} columns={4} />
        </div>
      ) : isAdmin && !effectiveSchoolId ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Choose a school</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a school above to view and manage staff document requirements.
          </p>
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No staff requirements yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by adding your first staff document requirement.
          </p>
          <Button onClick={openNew} className="mt-6 gap-2">
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
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-right font-medium w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium">{d.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span title={d.name} className="block truncate max-w-[200px]">
                        {d.name}
                      </span>
                      {d.description && (
                        <span className="text-xs text-muted-foreground truncate block max-w-[200px]" title={d.description}>
                          {d.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={d.is_mandatory ? "default" : "secondary"}>
                        {d.is_mandatory ? "Required" : "Optional"}
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

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Staff Requirement" : "Add Staff Requirement"}
            </DialogTitle>
            <DialogDescription>
              {editing 
                ? "Update the details for this staff document requirement."
                : "Define a new document that staff members must provide."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. CPR Certification"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="mandatory" className="font-medium">Mandatory</Label>
                <p className="text-xs text-muted-foreground">Staff must provide this document</p>
              </div>
              <Switch
                id="mandatory"
                checked={form.is_mandatory}
                onCheckedChange={(val) =>
                  setForm((f) => ({ ...f, is_mandatory: Boolean(val) }))
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the requirement "{docToDelete?.name}". 
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

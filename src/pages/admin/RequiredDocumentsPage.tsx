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
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash2, Plus, FileText } from "lucide-react";

type RequiredDocument = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  applies_to_age_min: number | null;
  applies_to_age_max: number | null;
  school_id: string;
};

export default function RequiredDocumentsPage() {
  const { canManageSchool, schoolId } = useUserRole();
  const [docs, setDocs] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RequiredDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<RequiredDocument | null>(null);

  const [form, setForm] = useState({
    category: "",
    name: "",
    description: "",
    is_mandatory: true,
    ageMin: "",
    ageMax: "",
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentTypeService.list({ targetRole: 'STUDENT', schoolId: schoolId || undefined });
      setDocs(data as RequiredDocument[]);
    } catch {
      toast.error("Failed to load required documents");
    }
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      category: "",
      name: "",
      description: "",
      is_mandatory: true,
      ageMin: "",
      ageMax: "",
    });
    setOpen(true);
  };

  const openEdit = (doc: RequiredDocument) => {
    setEditing(doc);
    setForm({
      category: doc.category ?? "",
      name: doc.name ?? "",
      description: doc.description ?? "",
      is_mandatory: doc.is_mandatory,
      ageMin: doc.applies_to_age_min?.toString() ?? "",
      ageMax: doc.applies_to_age_max?.toString() ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.category.trim() || !form.name.trim()) {
      toast.error("Category and name are required");
      return;
    }

    if (!schoolId) {
      toast.error("No school associated with your account");
      return;
    }

    const payload = {
      category: form.category.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_mandatory: form.is_mandatory,
      applies_to_age_min: form.ageMin ? Number(form.ageMin) : null,
      applies_to_age_max: form.ageMax ? Number(form.ageMax) : null,
      school_id: schoolId,
      target_role: 'STUDENT',
    };

    try {
      if (editing) {
        const updated = await documentTypeService.update(editing.id, payload);
        toast.success("Document updated");
        setDocs((prev) =>
          prev.map((d) => (d.id === editing.id ? (updated as RequiredDocument) : d))
        );
      } else {
        const created = await documentTypeService.create(payload);
        toast.success("Document added");
        setDocs((prev) => [...prev, created as RequiredDocument]);
      }
      setOpen(false);
    } catch {
      toast.error("Failed to save document");
    }
  };

  const confirmDelete = (doc: RequiredDocument) => {
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
        <p className="text-muted-foreground">You don't have permission to manage required documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-primary/20 text-foreground">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student Required Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define which documents parents must upload for students
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Requirement
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-lg border">
          <TableSkeleton rows={5} columns={5} />
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No requirements yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by adding your first document requirement.
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
                  <th className="py-3 px-4 text-left font-medium">Age Range</th>
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
                    <td className="py-3 px-4 text-muted-foreground">
                      {d.applies_to_age_min != null || d.applies_to_age_max != null ? (
                        <span>{d.applies_to_age_min ?? "0"} – {d.applies_to_age_max ?? "∞"} yrs</span>
                      ) : (
                        <span className="text-muted-foreground/60">All ages</span>
                      )}
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
              {editing ? "Edit Requirement" : "Add Requirement"}
            </DialogTitle>
            <DialogDescription>
              {editing 
                ? "Update the details for this document requirement."
                : "Define a new document that parents must upload for students."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                placeholder="e.g. Health, Legal, Allergy"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
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
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description for parents"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="mandatory" className="font-medium">Mandatory</Label>
                <p className="text-xs text-muted-foreground">Parents must upload this document</p>
              </div>
              <Switch
                id="mandatory"
                checked={form.is_mandatory}
                onCheckedChange={(val) =>
                  setForm((f) => ({ ...f, is_mandatory: Boolean(val) }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageMin">Min Age (years)</Label>
                <Input
                  id="ageMin"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.ageMin}
                  onChange={(e) => setForm((f) => ({ ...f, ageMin: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageMax">Max Age (years)</Label>
                <Input
                  id="ageMax"
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={form.ageMax}
                  onChange={(e) => setForm((f) => ({ ...f, ageMax: e.target.value }))}
                />
              </div>
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

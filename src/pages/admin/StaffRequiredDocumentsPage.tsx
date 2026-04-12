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
import { Pencil, Trash2, Plus, Users } from "lucide-react";

type StaffRequiredDocument = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
};

export default function StaffRequiredDocumentsPage() {
  const { schoolId } = useUserRole();
  const [docs, setDocs] = useState<StaffRequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRequiredDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<StaffRequiredDocument | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    category: "",
    name: "",
    description: "",
    is_mandatory: true,
  });

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await documentTypeService.list({ targetRole: 'TEACHER', schoolId: schoolId || undefined });
      setDocs(data as StaffRequiredDocument[]);
    } catch {
      // silently fail
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
    });
    setOpen(true);
  };

  const openEdit = (doc: StaffRequiredDocument) => {
    setEditing(doc);
    setForm({
      category: doc.category ?? "",
      name: doc.name ?? "",
      description: doc.description ?? "",
      is_mandatory: doc.is_mandatory,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.category.trim() || !form.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category and name are required",
        variant: "destructive",
      });
      return;
    }

    if (!schoolId) {
      toast({
        title: "Error",
        description: "Could not determine your school",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      category: form.category.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_mandatory: form.is_mandatory,
      school_id: schoolId,
      target_role: 'TEACHER',
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
      loadDocs();
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
          <h1 className="text-2xl font-semibold tracking-tight">Staff Required Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define which documents staff members must provide
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
          <TableSkeleton rows={5} columns={4} />
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
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                placeholder="e.g. Certification, Background Check"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
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

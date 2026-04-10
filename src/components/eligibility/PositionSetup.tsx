import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Briefcase,
  GraduationCap,
  Award,
  Loader2,
  Clock,
} from "lucide-react";
import { StaggeredGrid } from "@/components/ui/animations";

interface Position {
  id: string;
  name: string;
  description: string | null;
  min_education_level: string | null;
  min_credits: number;
  min_ece_credits: number;
  min_years_experience: number;
  requires_cda: boolean;
  requires_state_cert: boolean;
  is_active: boolean;
}

interface PositionSetupProps {
  schoolId: string | null;
}

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School Diploma' },
  { value: 'some_college', label: 'Some College' },
  { value: 'associates', label: "Associate's Degree" },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'doctorate', label: 'Doctorate' },
];

const DEFAULT_FORM: Omit<Position, 'id'> = {
  name: '',
  description: '',
  min_education_level: null,
  min_credits: 0,
  min_ece_credits: 0,
  min_years_experience: 0,
  requires_cda: false,
  requires_state_cert: false,
  is_active: true,
};

export function PositionSetup({ schoolId }: PositionSetupProps) {
  const { toast } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null);
  const [form, setForm] = useState<Omit<Position, 'id'>>(DEFAULT_FORM);

  useEffect(() => {
    if (schoolId) {
      fetchPositions();
    }
  }, [schoolId]);

  const fetchPositions = async () => {
    if (!schoolId) return;

    try {
      setLoading(true);
      const data = await api.get(`/teacher-positions?schoolId=${schoolId}`);
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast({
        title: "Error",
        description: "Failed to load positions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (position?: Position) => {
    if (position) {
      setEditingPosition(position);
      setForm({
        name: position.name,
        description: position.description,
        min_education_level: position.min_education_level,
        min_credits: position.min_credits,
        min_ece_credits: position.min_ece_credits,
        min_years_experience: position.min_years_experience,
        requires_cda: position.requires_cda,
        requires_state_cert: position.requires_state_cert,
        is_active: position.is_active,
      });
    } else {
      setEditingPosition(null);
      setForm(DEFAULT_FORM);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!schoolId || !form.name.trim()) {
      toast({
        title: "Error",
        description: "Position name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (editingPosition) {
        await api.patch(`/teacher-positions/${editingPosition.id}`, {
          ...form,
          updated_at: new Date().toISOString(),
        });
        toast({ title: "Position updated" });
      } else {
        await api.post('/teacher-positions', {
          ...form,
          school_id: schoolId,
        });
        toast({ title: "Position created" });
      }

      setDialogOpen(false);
      fetchPositions();
    } catch (error) {
      console.error('Error saving position:', error);
      toast({
        title: "Error",
        description: "Failed to save position",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPosition) return;

    try {
      await api.delete(`/teacher-positions/${deletingPosition.id}`);

      toast({ title: "Position deleted" });
      setDeleteDialogOpen(false);
      setDeletingPosition(null);
      fetchPositions();
    } catch (error) {
      console.error('Error deleting position:', error);
      toast({
        title: "Error",
        description: "Failed to delete position. It may be assigned to staff members.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (position: Position) => {
    try {
      await api.patch(`/teacher-positions/${position.id}`, { is_active: !position.is_active });
      fetchPositions();
    } catch (error) {
      console.error('Error toggling position:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Staff Positions</h3>
          <p className="text-sm text-muted-foreground">
            Define available roles and their minimum requirements
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Position
        </Button>
      </div>

      {/* Empty State */}
      {positions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/10 p-6 ring-1 ring-amber-500/20">
                  <Briefcase className="h-10 w-10 text-amber-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">No positions defined</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Create positions like Lead Teacher, Assistant Teacher, or Aide to define qualification requirements and track staff eligibility.
              </p>
              <Button onClick={() => handleOpenDialog()} variant="premium" className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Position
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <StaggeredGrid>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((position, index) => (
              <Card 
                key={position.id} 
                variant={position.is_active ? "elevated" : "default"}
                className={`transition-all duration-200 ${!position.is_active ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="truncate">{position.name}</span>
                        {!position.is_active && (
                          <Badge variant="muted" className="text-xs flex-shrink-0">Inactive</Badge>
                        )}
                      </CardTitle>
                      {position.description && (
                        <CardDescription className="mt-1 line-clamp-2">{position.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(position)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setDeletingPosition(position);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {position.min_education_level && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10">
                          <GraduationCap className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-muted-foreground">
                          {EDUCATION_LEVELS.find(e => e.value === position.min_education_level)?.label}
                        </span>
                      </div>
                    )}
                    {(position.min_credits > 0 || position.min_ece_credits > 0) && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-violet-500/10">
                          <Award className="h-3.5 w-3.5 text-violet-500" />
                        </div>
                        <span className="text-muted-foreground">
                          {position.min_credits > 0 && `${position.min_credits} credits`}
                          {position.min_credits > 0 && position.min_ece_credits > 0 && ' / '}
                          {position.min_ece_credits > 0 && `${position.min_ece_credits} ECE`}
                        </span>
                      </div>
                    )}
                    {position.min_years_experience > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/10">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <span className="text-muted-foreground">{position.min_years_experience}+ years experience</span>
                      </div>
                    )}
                  </div>
                  
                  {(position.requires_cda || position.requires_state_cert) && (
                    <div className="flex flex-wrap gap-1.5">
                      {position.requires_cda && (
                        <Badge variant="outline" className="text-xs">CDA Required</Badge>
                      )}
                      {position.requires_state_cert && (
                        <Badge variant="outline" className="text-xs">State Cert Required</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <Switch
                      checked={position.is_active}
                      onCheckedChange={() => handleToggleActive(position)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </StaggeredGrid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? 'Edit Position' : 'Create Position'}
            </DialogTitle>
            <DialogDescription>
              Define the position name and minimum requirements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Position Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Lead Teacher"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of responsibilities..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Education Level</Label>
              <Select
                value={form.min_education_level || 'none'}
                onValueChange={(v) => setForm({ ...form, min_education_level: v === 'none' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No minimum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No minimum</SelectItem>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Credits</Label>
                <Input
                  type="number"
                  value={form.min_credits}
                  onChange={(e) => setForm({ ...form, min_credits: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min ECE Credits</Label>
                <Input
                  type="number"
                  value={form.min_ece_credits}
                  onChange={(e) => setForm({ ...form, min_ece_credits: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Experience</Label>
                <Input
                  type="number"
                  value={form.min_years_experience}
                  onChange={(e) => setForm({ ...form, min_years_experience: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Required Certifications</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cda"
                    checked={form.requires_cda}
                    onCheckedChange={(c) => setForm({ ...form, requires_cda: !!c })}
                  />
                  <Label htmlFor="cda" className="cursor-pointer font-normal">
                    CDA Credential Required
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="state_cert"
                    checked={form.requires_state_cert}
                    onCheckedChange={(c) => setForm({ ...form, requires_state_cert: !!c })}
                  />
                  <Label htmlFor="state_cert" className="cursor-pointer font-normal">
                    State Certification Required
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPosition ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPosition?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

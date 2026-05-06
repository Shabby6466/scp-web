import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { requirementService, type RequirementRule, type ScopeLevel } from "@/services/requirementService";
import { documentTypeService } from "@/services/documentTypeService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const ROLES = ["TEACHER", "STUDENT", "PARENT", "BRANCH_DIRECTOR"] as const;

export default function SchoolRequirementsPage() {
  const { schoolId, branchId, isDirector, isBranchDirector } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<RequirementRule[]>([]);
  const [docTypes, setDocTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    documentTypeId: "",
    scopeLevel: (isBranchDirector ? "BRANCH" : "SCHOOL") as ScopeLevel,
    targetRole: "TEACHER",
    cadence: "NONE",
    effectiveFrom: "",
    effectiveTo: "",
  });

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [rulesData, typesData] = await Promise.all([
        requirementService.listRules({
          schoolId,
          ...(isBranchDirector && branchId ? { branchId } : {}),
        }),
        documentTypeService.list({ schoolId }),
      ]);
      setRules(Array.isArray(rulesData) ? rulesData : []);
      setDocTypes(
        (Array.isArray(typesData) ? typesData : [])
          .map((t: any) => ({ id: t.id, name: t.name }))
          .filter((t) => t.id && t.name),
      );
    } catch {
      toast.error("Failed to load requirement rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [schoolId, branchId, isBranchDirector]);

  const createRule = async () => {
    if (!schoolId || !form.documentTypeId) return;
    try {
      await requirementService.createRule({
        documentTypeId: form.documentTypeId,
        scopeLevel: form.scopeLevel,
        schoolId,
        ...(form.scopeLevel === "BRANCH" && branchId ? { branchId } : {}),
        targetRole: form.targetRole,
        cadence: form.cadence,
        effectiveFrom: form.effectiveFrom || undefined,
        effectiveTo: form.effectiveTo || undefined,
      });
      toast.success("Requirement rule created");
      setOpen(false);
      setForm((f) => ({ ...f, documentTypeId: "", effectiveFrom: "", effectiveTo: "" }));
      await load();
    } catch {
      toast.error("Failed to create requirement rule");
    }
  };

  const toggleRule = async (rule: RequirementRule) => {
    try {
      await requirementService.updateRule(rule.id, { isActive: !rule.isActive });
      await load();
    } catch {
      toast.error("Failed to update rule");
    }
  };

  if (!isDirector && !isBranchDirector) {
    return <div className="p-6 text-sm text-muted-foreground">Only directors can manage requirement rules.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Requirement Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define required documents and certifications by role.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Requirement Rule</DialogTitle>
              <DialogDescription>Materializes assignments for matching users.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Document type</Label>
                <Select value={form.documentTypeId} onValueChange={(v) => setForm((f) => ({ ...f, documentTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                  <SelectContent>
                    {docTypes.map((dt) => <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select
                  value={form.scopeLevel}
                  onValueChange={(v) => setForm((f) => ({ ...f, scopeLevel: v as ScopeLevel }))}
                  disabled={isBranchDirector}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!isBranchDirector && <SelectItem value="SCHOOL">School</SelectItem>}
                    <SelectItem value="BRANCH">Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target role</Label>
                <Select value={form.targetRole} onValueChange={(v) => setForm((f) => ({ ...f, targetRole: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Effective from</Label>
                  <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
                </div>
                <div>
                  <Label>Effective to</Label>
                  <Input type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createRule}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requirement rules yet.</p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-medium">{rule.documentType?.name ?? rule.documentTypeId}</div>
                    <div className="text-xs text-muted-foreground">
                      {rule.scopeLevel} · {rule.targetRole}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => toggleRule(rule)}>
                      {rule.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

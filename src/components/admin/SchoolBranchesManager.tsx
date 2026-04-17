import { useState } from "react";
import { Plus, MapPin, Trash2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export interface SchoolBranch {
  id?: string;
  branch_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email?: string;
  min_age?: number;
  max_age?: number;
  total_capacity?: number;
  is_primary: boolean;
  notes?: string;
}

interface SchoolBranchesManagerProps {
  branches: SchoolBranch[];
  onChange: (branches: SchoolBranch[]) => void;
  defaultState?: string;
  /** ADMIN & DIRECTOR: create/delete branches. Branch directors only edit existing rows. */
  allowAddRemove?: boolean;
}

const emptyBranch = (isPrimary: boolean, defaultState: string = "NY"): SchoolBranch => ({
  branch_name: isPrimary ? "Main branch" : "",
  address: "",
  city: "",
  state: defaultState,
  zip_code: "",
  phone: "",
  email: "",
  min_age: 2,
  max_age: 5,
  total_capacity: 50,
  is_primary: isPrimary,
  notes: "",
});

export const SchoolBranchesManager = ({
  branches,
  onChange,
  defaultState = "NY",
  allowAddRemove = true,
}: SchoolBranchesManagerProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addBranch = () => {
    const newBranch = emptyBranch(branches.length === 0, defaultState);
    onChange([...branches, newBranch]);
    setEditingIndex(branches.length);
  };

  const updateBranch = (index: number, field: keyof SchoolBranch, value: any) => {
    const updated = [...branches];
    updated[index] = { ...updated[index], [field]: value };
    
    // If setting a branch as primary, unset others
    if (field === "is_primary" && value === true) {
      updated.forEach((branch, i) => {
        if (i !== index) {
          branch.is_primary = false;
        }
      });
    }
    
    onChange(updated);
  };

  const removeBranch = (index: number) => {
    const updated = branches.filter((_, i) => i !== index);
    // Ensure at least one primary branch
    if (updated.length > 0 && !updated.some(b => b.is_primary)) {
      updated[0].is_primary = true;
    }
    onChange(updated);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Branches
          </h3>
          <p className="text-sm text-muted-foreground">
            Each branch is a campus or site (address, ages served, capacity).
          </p>
        </div>
        {allowAddRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBranch}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add branch
          </Button>
        )}
      </div>

      {branches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Building className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              {allowAddRemove
                ? 'No branches yet. Add your main campus to get started.'
                : 'No branch record loaded. Contact a school director if this looks wrong.'}
            </p>
            {allowAddRemove && (
              <Button type="button" onClick={addBranch} className="gap-2">
                <Plus className="h-4 w-4" />
                Add branch
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {branches.map((branch, index) => (
            <Card key={index} className={branch.is_primary ? "border-primary/50" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {branch.branch_name || `Branch ${index + 1}`}
                    {branch.is_primary && (
                      <Badge variant="default" className="ml-2">Primary</Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    >
                      {editingIndex === index ? "Collapse" : "Edit"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBranch(index)}
                      disabled={branches.length === 1 || !allowAddRemove}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {editingIndex !== index && (
                  <CardDescription className="text-xs">
                    {branch.address}, {branch.city}, {branch.state} {branch.zip_code}
                    {branch.min_age !== undefined && branch.max_age !== undefined && (
                      <> • Ages {branch.min_age}-{branch.max_age}</>
                    )}
                  </CardDescription>
                )}
              </CardHeader>

              {editingIndex === index && (
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Branch name *</Label>
                      <Input
                        value={branch.branch_name}
                        onChange={(e) => updateBranch(index, "branch_name", e.target.value)}
                        placeholder="Main Campus, Downtown Location, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={branch.is_primary}
                          onChange={(e) => updateBranch(index, "is_primary", e.target.checked)}
                          className="rounded"
                        />
                        Set as primary branch
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        The primary branch is used as the default site for communications when relevant
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Street Address *</Label>
                    <Input
                      value={branch.address}
                      onChange={(e) => updateBranch(index, "address", e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Input
                        value={branch.city}
                        onChange={(e) => updateBranch(index, "city", e.target.value)}
                        placeholder="New York"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Input
                        value={branch.state}
                        onChange={(e) => updateBranch(index, "state", e.target.value)}
                        placeholder="NY"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>ZIP Code *</Label>
                      <Input
                        value={branch.zip_code}
                        onChange={(e) => updateBranch(index, "zip_code", e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        value={branch.phone}
                        onChange={(e) => updateBranch(index, "phone", e.target.value)}
                        placeholder="(212) 555-0123"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={branch.email || ""}
                        onChange={(e) => updateBranch(index, "email", e.target.value)}
                        placeholder="location@school.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Age *</Label>
                      <Input
                        type="number"
                        value={branch.min_age || ""}
                        onChange={(e) => updateBranch(index, "min_age", parseInt(e.target.value))}
                        placeholder="2"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">In years</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Maximum Age *</Label>
                      <Input
                        type="number"
                        value={branch.max_age || ""}
                        onChange={(e) => updateBranch(index, "max_age", parseInt(e.target.value))}
                        placeholder="5"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">In years</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Capacity *</Label>
                      <Input
                        type="number"
                        value={branch.total_capacity || ""}
                        onChange={(e) => updateBranch(index, "total_capacity", parseInt(e.target.value))}
                        placeholder="50"
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">Number of students</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={branch.notes || ""}
                      onChange={(e) => updateBranch(index, "notes", e.target.value)}
                      placeholder="Additional information about this location..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

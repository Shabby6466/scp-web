import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentTypeRequirementsPanel from "@/components/requirements/DocumentTypeRequirementsPanel";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const TAB_VALUES = [
  "students",
  "staff",
  "parents",
  "school-directors",
  "branch-directors",
] as const;

export type RequirementsTab = (typeof TAB_VALUES)[number];

function isRequirementsTab(v: string): v is RequirementsTab {
  return (TAB_VALUES as readonly string[]).includes(v);
}

const TAB_LABELS: Record<RequirementsTab, string> = {
  students: "Students",
  staff: "Staff",
  parents: "Parents",
  "school-directors": "School directors",
  "branch-directors": "Branch directors",
};

export default function UnifiedRequirementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isBranchDirector, canManageSchool } = useUserRole();

  const allowedTabs = useMemo((): RequirementsTab[] => {
    const t: RequirementsTab[] = ["students", "staff", "parents"];
    if (isAdmin) t.push("school-directors");
    if (!isBranchDirector) t.push("branch-directors");
    return t;
  }, [isAdmin, isBranchDirector]);

  const rawTab = searchParams.get("tab") ?? "students";

  const resolvedTab: RequirementsTab = useMemo(() => {
    if (!isRequirementsTab(rawTab)) return "students";
    if (!allowedTabs.includes(rawTab)) return "students";
    return rawTab;
  }, [rawTab, allowedTabs]);

  useEffect(() => {
    const invalidKey = !isRequirementsTab(rawTab);
    if (resolvedTab !== rawTab || invalidKey) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", resolvedTab);
          return next;
        },
        { replace: true },
      );
    }
  }, [resolvedTab, rawTab, setSearchParams]);

  const setTab = (v: RequirementsTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", v);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Requirements</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Configure document type templates for each audience. Saving a type creates
          per-user requirements automatically. Use Compliance Center to monitor status.
        </p>
      </div>

      <Tabs
        value={resolvedTab}
        onValueChange={(v) => setTab(v as RequirementsTab)}
        className="space-y-6"
      >
        <TabsList
          className={cn(
            "flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1",
          )}
        >
          {allowedTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm">
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="students" className="mt-0 outline-none">
          <DocumentTypeRequirementsPanel
            targetRole="STUDENT"
            title="Student documents"
            description="Define required documents and certifications for enrolled students."
            canConfigure
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-0 outline-none">
          <DocumentTypeRequirementsPanel
            targetRole="TEACHER"
            title="Staff documents"
            description="Define required documents and certifications for teachers and staff."
            canConfigure
          />
        </TabsContent>

        <TabsContent value="parents" className="mt-0 outline-none">
          <DocumentTypeRequirementsPanel
            targetRole="PARENT"
            title="Parent documents"
            description="Define documents guardians must submit for enrollment or compliance."
            canConfigure
            allowBranchScope={false}
          />
        </TabsContent>

        <TabsContent value="school-directors" className="mt-0 outline-none">
          <DocumentTypeRequirementsPanel
            targetRole="DIRECTOR"
            title="School director documents"
            description="Documents required of school directors (managed by platform admins)."
            canConfigure={isAdmin}
            permissionMessage="Only platform admins can configure school director document requirements."
            allowBranchScope={false}
          />
        </TabsContent>

        <TabsContent value="branch-directors" className="mt-0 outline-none">
          <DocumentTypeRequirementsPanel
            targetRole="BRANCH_DIRECTOR"
            title="Branch director documents"
            description="Documents required of branch directors."
            canConfigure={canManageSchool && !isBranchDirector}
            permissionMessage="Branch directors cannot configure branch director document types."
            allowBranchScope={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

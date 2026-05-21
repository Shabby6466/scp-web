import DocumentTypeRequirementsPanel from "@/components/requirements/DocumentTypeRequirementsPanel";

/** @deprecated Prefer `/school/requirements?tab=students` — kept for compatibility. */
export default function RequiredDocumentsPage() {
  return (
    <div className="p-6">
      <DocumentTypeRequirementsPanel
        targetRole="STUDENT"
        title="Student document requirements"
        description="Define required documents and certifications for enrolled students."
        canConfigure
      />
    </div>
  );
}

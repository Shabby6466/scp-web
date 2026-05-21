import DocumentTypeRequirementsPanel from "@/components/requirements/DocumentTypeRequirementsPanel";

/** @deprecated Prefer `/school/requirements?tab=staff` — kept for compatibility. */
export default function StaffRequiredDocumentsPage() {
  return (
    <div className="p-6">
      <DocumentTypeRequirementsPanel
        targetRole="TEACHER"
        title="Staff document requirements"
        description="Define required documents and certifications for teachers and staff."
        canConfigure
      />
    </div>
  );
}

/**
 * @deprecated Certifications are document types in the certifications category.
 * Use documentTypeService + requirementService + documentService instead.
 */
import { documentCategoryService } from '@/services/documentCategoryService';
import { documentTypeService } from '@/services/documentTypeService';
import { documentService } from '@/services/documentService';
import { requirementService } from '@/services/requirementService';
import { unwrapList } from '@/lib/api';

export const useCertifications = (schoolId?: string | null) => {
  const loadTypes = async () => {
    if (!schoolId) return [];
    const categories = unwrapList(await documentCategoryService.list({ schoolId }));
    const certCategory = categories.find((c) => c.slug === 'certifications');
    if (!certCategory) return [];
    return unwrapList(
      await documentTypeService.list({ schoolId, categoryId: certCategory.id }),
    );
  };

  const loadRecords = async () => {
    if (!schoolId) return [];
    const types = await loadTypes();
    const typeIds = new Set(types.map((t) => t.id));
    const docs = unwrapList(await documentService.search({ schoolId, limit: 200 }));
    return docs.filter((d: { documentTypeId?: string }) => typeIds.has(d.documentTypeId ?? ''));
  };

  const loadRequirements = async () => {
    if (!schoolId) return [];
    const types = await loadTypes();
    const typeIds = new Set(types.map((t) => t.id));
    const reqs = unwrapList(await requirementService.list({ schoolId }));
    return reqs.filter((r) => typeIds.has(r.documentTypeId));
  };

  return {
    loadTypes,
    loadRecords,
    loadRequirements,
  };
};

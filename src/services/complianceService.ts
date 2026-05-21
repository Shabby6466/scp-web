/**
 * @deprecated Legacy compliance API removed from backend.
 * Use documentCategoryService, documentTypeService, requirementService instead.
 */
import { documentCategoryService } from './documentCategoryService';

export const complianceService = {
  listCategories: (schoolId?: string) =>
    documentCategoryService.list(schoolId ? { schoolId } : undefined),

  createCategory: (data: Parameters<typeof documentCategoryService.create>[0]) =>
    documentCategoryService.create(data),

  updateCategory: (id: string, data: Parameters<typeof documentCategoryService.update>[1]) =>
    documentCategoryService.update(id, data),

  deleteCategory: (id: string) => documentCategoryService.remove(id),
};

import { api } from '@/lib/api';

export const settingsService = {
  getAppConfig: () => api.get('/settings'),
  updateAppConfig: (data: any) => api.patch('/settings', data),
};

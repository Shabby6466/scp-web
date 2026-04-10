import { api } from '@/lib/api';

export const storageService = {
  uploadFile: async (presignedUrl: string, file: File): Promise<void> => {
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  },
  getPresignedUrl: (data: { documentTypeId: string; ownerUserId: string; fileName: string; mimeType: string; sizeBytes: number }) =>
    api.post('/documents/presign', data),
};

import { api } from "@/lib/api";

export const SIGNED_URL_EXPIRY = {
  VIEW: 900,
  DOWNLOAD: 900,
};

type StorageBucket = "documents" | "teacher-documents" | "staff-resumes" | "document-templates";

export async function getSignedUrl(
  bucket: StorageBucket,
  filePath: string,
  expiresIn: number = SIGNED_URL_EXPIRY.VIEW
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const data = await api.get(
      `/storage/download-url?bucket=${bucket}&key=${encodeURIComponent(filePath)}&expiresIn=${expiresIn}`
    );
    return { url: data.url || data, error: null };
  } catch (err) {
    console.error(`Error creating signed URL for ${bucket}/${filePath}:`, err);
    return { url: null, error: err as Error };
  }
}

export async function downloadFileAsBlob(
  bucket: StorageBucket,
  filePath: string
): Promise<{ blob: Blob | null; error: Error | null }> {
  try {
    const { url, error } = await getSignedUrl(bucket, filePath, SIGNED_URL_EXPIRY.DOWNLOAD);
    if (error || !url) {
      return { blob: null, error: error || new Error('Failed to get signed URL') };
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    return { blob, error: null };
  } catch (err) {
    console.error(`Exception downloading file:`, err);
    return { blob: null, error: err as Error };
  }
}

export async function downloadFile(
  bucket: StorageBucket,
  filePath: string,
  fileName: string
): Promise<{ success: boolean; error: Error | null }> {
  const { url, error } = await getSignedUrl(bucket, filePath, SIGNED_URL_EXPIRY.DOWNLOAD);

  if (error || !url) {
    return { success: false, error: error || new Error("Failed to get signed URL") };
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, error: null };
}

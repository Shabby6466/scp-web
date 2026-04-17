/**
 * Check if a URL or filename points to a PDF file
 */
export function isPdfFile(filename: string | null | undefined): boolean {
  if (filename == null || typeof filename !== 'string') return false;
  return filename.toLowerCase().endsWith('.pdf');
}

/**
 * Check if a URL or filename points to an image file
 */
export function isImageFile(filename: string | null | undefined): boolean {
  if (filename == null || typeof filename !== 'string') return false;
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(ext);
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string | null | undefined): 'pdf' | 'image' | 'unknown' {
  if (isPdfFile(filename)) return 'pdf';
  if (isImageFile(filename)) return 'image';
  return 'unknown';
}

/**
 * Check if a URL or filename points to a PDF file
 */
export function isPdfFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

/**
 * Check if a URL or filename points to an image file
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(ext);
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string): 'pdf' | 'image' | 'unknown' {
  if (isPdfFile(filename)) return 'pdf';
  if (isImageFile(filename)) return 'image';
  return 'unknown';
}

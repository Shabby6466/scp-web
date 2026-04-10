import { Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PdfViewerProps {
  url: string;
  filename?: string;
  className?: string;
}

const PdfViewer = ({ url, filename, className = '' }: PdfViewerProps) => {
  const [scale, setScale] = useState(100);

  const zoomIn = () => setScale((prev) => Math.min(prev + 25, 200));
  const zoomOut = () => setScale((prev) => Math.max(prev - 25, 50));

  const openInNewTab = () => {
    window.open(url, '_blank');
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {scale}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openInNewTab}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href={url} download={filename || 'document.pdf'}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        </div>
      </div>

      {/* PDF Display using iframe - most reliable cross-browser */}
      <div className="flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        <iframe
          src={`${url}#toolbar=1&navpanes=0&scrollbar=1&zoom=${scale}`}
          className="w-full h-full border-0"
          title={filename || 'PDF Document'}
        />
      </div>
    </div>
  );
};

export default PdfViewer;

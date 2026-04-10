import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, Upload, FileCheck } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentTimelineProps {
  documentId: string;
}

interface TimelineEvent {
  type: 'created' | 'approved' | 'rejected' | 'updated';
  date: string;
  status: string;
  notes?: string;
}

const DocumentTimeline = ({ documentId }: DocumentTimelineProps) => {
  const [document, setDocument] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const data = await documentService.getById(documentId);
      if (data) {
        setDocument(data);
        buildTimeline(data);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
    }
  };

  const buildTimeline = (doc: any) => {
    const events: TimelineEvent[] = [
      {
        type: 'created',
        date: doc.created_at,
        status: 'pending',
        notes: 'Document uploaded'
      }
    ];

    if (doc.status === 'approved') {
      events.push({
        type: 'approved',
        date: doc.updated_at,
        status: 'approved',
        notes: 'Document approved by school'
      });
    } else if (doc.status === 'rejected') {
      events.push({
        type: 'rejected',
        date: doc.updated_at,
        status: 'rejected',
        notes: doc.notes || 'Document rejected - please resubmit'
      });
    }

    setTimeline(events);
  };

  const getIcon = (type: string, status: string) => {
    if (type === 'created') return <Upload className="h-4 w-4" />;
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'rejected') return <XCircle className="h-4 w-4 text-red-600" />;
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-600" />;
    return <FileCheck className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-600">Approved</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    if (status === 'pending') return <Badge variant="outline" className="border-yellow-600 text-yellow-700">Pending</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (!document) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Document History</CardTitle>
        <CardDescription>Timeline of events for this document</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted border-2 border-border">
                  {getIcon(event.type, event.status)}
                </div>
                {index < timeline.length - 1 && (
                  <div className="w-0.5 h-12 bg-border" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{event.notes}</p>
                  {getStatusBadge(event.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.date), 'MMM dd, yyyy • h:mm a')}
                </p>
              </div>
            </div>
          ))}
          
          {document.status === 'pending' && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 border-2 border-dashed border-border">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium text-muted-foreground">Awaiting Review</p>
                <p className="text-sm text-muted-foreground">
                  Your document is being reviewed by the school
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentTimeline;

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, ChevronUp, User, GraduationCap, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ExpiringDocument {
  id: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  school_id: string;
  school_name: string;
  expiration_date: string;
  days_until_expiry: number;
}

interface ExpiringSoonListProps {
  documents: ExpiringDocument[];
  loading: boolean;
}

export const ExpiringSoonList = ({ documents, loading }: ExpiringSoonListProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const getSeverityBadge = (days: number) => {
    if (days <= 7) return <Badge variant="destructive">Critical - {days} days</Badge>;
    if (days <= 14) return <Badge className="bg-orange-500 hover:bg-orange-600">{days} days</Badge>;
    if (days <= 30) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">{days} days</Badge>;
    return <Badge variant="secondary">{days} days</Badge>;
  };

  const formatDocumentType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Expiring Soon
          </CardTitle>
          <CardDescription>Documents expiring within the next 60 days</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No documents expiring soon. Great job keeping everything current!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by urgency
  const critical = documents.filter(d => d.days_until_expiry <= 7);
  const urgent = documents.filter(d => d.days_until_expiry > 7 && d.days_until_expiry <= 30);
  const upcoming = documents.filter(d => d.days_until_expiry > 30);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Expiring Soon
                <Badge variant="outline">{documents.length}</Badge>
              </CardTitle>
              <CardDescription>Documents expiring within the next 60 days</CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {critical.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Critical (7 days or less)
                </h4>
                <div className="space-y-2">
                  {critical.map((doc) => (
                    <DocumentRow key={`${doc.id}-${doc.document_type}`} doc={doc} getSeverityBadge={getSeverityBadge} formatDocumentType={formatDocumentType} />
                  ))}
                </div>
              </div>
            )}

            {urgent.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Urgent (8-30 days)
                </h4>
                <div className="space-y-2">
                  {urgent.map((doc) => (
                    <DocumentRow key={`${doc.id}-${doc.document_type}`} doc={doc} getSeverityBadge={getSeverityBadge} formatDocumentType={formatDocumentType} />
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Upcoming (31-60 days)
                </h4>
                <div className="space-y-2">
                  {upcoming.map((doc) => (
                    <DocumentRow key={`${doc.id}-${doc.document_type}`} doc={doc} getSeverityBadge={getSeverityBadge} formatDocumentType={formatDocumentType} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const DocumentRow = ({ 
  doc, 
  getSeverityBadge, 
  formatDocumentType 
}: { 
  doc: ExpiringDocument; 
  getSeverityBadge: (days: number) => JSX.Element;
  formatDocumentType: (type: string) => string;
}) => (
  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-3">
      {doc.entity_type === 'student' ? (
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
      ) : (
        <User className="h-4 w-4 text-muted-foreground" />
      )}
      <div>
        <p className="font-medium text-sm">{doc.entity_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDocumentType(doc.document_type)} · {doc.school_name}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="text-right text-xs text-muted-foreground">
        <Calendar className="h-3 w-3 inline mr-1" />
        {format(new Date(doc.expiration_date), 'MMM d, yyyy')}
      </div>
      {getSeverityBadge(doc.days_until_expiry)}
    </div>
  </div>
);

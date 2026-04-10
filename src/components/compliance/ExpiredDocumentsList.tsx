import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { XCircle, ChevronDown, ChevronUp, User, GraduationCap, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ExpiredDocument {
  id: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  school_id: string;
  school_name: string;
  expiration_date: string;
  days_expired: number;
}

interface ExpiredDocumentsListProps {
  documents: ExpiredDocument[];
  loading: boolean;
  isAdmin?: boolean;
}

export const ExpiredDocumentsList = ({ documents, loading, isAdmin = false }: ExpiredDocumentsListProps) => {
  const [isOpen, setIsOpen] = useState(!isAdmin); // Collapsed by default for admin

  const formatDocumentType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card className="border-red-200 dark:border-red-900">
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
            <XCircle className="h-5 w-5 text-red-500" />
            Expired Documents
          </CardTitle>
          <CardDescription>Documents that have passed their expiration date</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No expired documents. All documents are current!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-900">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="bg-red-50 dark:bg-red-950/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                Expired Documents
                <Badge variant="destructive">{documents.length}</Badge>
              </CardTitle>
              <CardDescription>Documents requiring immediate attention</CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={`${doc.id}-${doc.document_type}`} 
                  className="flex items-center justify-between p-3 border border-red-100 dark:border-red-900 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {doc.entity_type === 'student' ? (
                      <GraduationCap className="h-4 w-4 text-red-500" />
                    ) : (
                      <User className="h-4 w-4 text-red-500" />
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
                    <Badge variant="destructive">
                      {doc.days_expired} {doc.days_expired === 1 ? 'day' : 'days'} ago
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

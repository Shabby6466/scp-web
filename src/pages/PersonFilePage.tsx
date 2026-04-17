import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Download,
  Eye,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { userService } from "@/services/userService";
import { studentProfileService } from "@/services/studentProfileService";
import { documentTypeService } from "@/services/documentTypeService";
import { documentService } from "@/services/documentService";
import { useUserRole } from "@/hooks/useUserRole";
import { ExportAllButton } from "@/components/documents/ExportAllButton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DocumentItem {
  id: string;
  name: string;
  status: "uploaded" | "missing" | "pending" | "approved" | "rejected" | "expired";
  filePath?: string;
  fileName?: string;
  expirationDate?: string;
  uploadedAt?: string;
}

interface PersonInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  type: "student" | "teacher";
}

export default function PersonFilePage() {
  const { type, personId } = useParams<{ type: string; personId: string }>();
  const navigate = useNavigate();
  const { schoolId } = useUserRole();
  const [person, setPerson] = useState<PersonInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; name: string } | null>(null);

  const isStudent = type === "student";

  useEffect(() => {
    if (personId && type) {
      loadPersonData();
    }
  }, [personId, type, schoolId]);

  const loadPersonData = async () => {
    setLoading(true);
    try {
      if (!personId) return;

      if (isStudent) {
        const prof: any = await studentProfileService.getById(personId);
        const personSchoolId =
          prof.schoolId ?? prof.branch?.schoolId ?? schoolId ?? undefined;

        setPerson({
          id: prof.id,
          firstName: prof.firstName ?? '',
          lastName: prof.lastName ?? '',
          email: undefined,
          phone: prof.guardianPhone ?? undefined,
          dateOfBirth: prof.dateOfBirth ?? undefined,
          type: "student",
        });

        const [reqRes, docsRes] = await Promise.all([
          studentProfileService.listRequiredDocumentTypes(personId),
          documentService.listByOwner(personId),
        ]);

        const requirements: any[] = Array.isArray(reqRes) ? reqRes : (reqRes as any)?.data ?? [];
        const uploadedDocs: any[] = Array.isArray(docsRes) ? docsRes : (docsRes as any)?.data ?? [];

        const docList: DocumentItem[] = requirements.map((req: any) => {
          const uploaded = uploadedDocs.find(
            (d: any) =>
              d.documentTypeId === req.id ||
              d.documentType?.name === req.name ||
              d.documentType?.category === req.category ||
              d.category === req.category
          );
          if (uploaded) {
            const isExpired = uploaded.expirationDate && new Date(uploaded.expirationDate) < new Date();
            const apiStatus = (uploaded.status ?? '').toLowerCase();
            let status: DocumentItem["status"] = apiStatus === 'approved' ? 'approved'
              : apiStatus === 'pending' ? 'pending'
              : apiStatus === 'rejected' ? 'rejected'
              : isExpired ? 'expired'
              : 'uploaded';
            return {
              id: uploaded.id,
              name: req.name,
              status,
              filePath: uploaded.filePath ?? uploaded.s3Key,
              fileName: uploaded.fileName,
              expirationDate: uploaded.expirationDate ?? uploaded.expiresAt,
              uploadedAt: uploaded.createdAt,
            };
          }
          return {
            id: req.id,
            name: req.name,
            status: "missing" as const,
          };
        });

        setDocuments(docList);
        return;
      }

      const detail: any = await userService.getDetail(personId);
      const profile = detail.teacherProfile;
      const personSchoolId = detail.schoolId ?? schoolId;

      setPerson({
        id: detail.id,
        firstName: profile?.firstName ?? detail.name?.split(' ')[0] ?? '',
        lastName: profile?.lastName ?? detail.name?.split(' ').slice(1).join(' ') ?? '',
        email: detail.email ?? undefined,
        phone: profile?.phone ?? detail.phone ?? undefined,
        dateOfBirth: profile?.dateOfBirth ?? undefined,
        type: "teacher",
      });

      const [reqRes, docsRes] = await Promise.all([
        documentTypeService.list({ schoolId: personSchoolId ?? undefined, targetRole: 'TEACHER' }),
        documentService.listByOwner(personId),
      ]);

      const requirements: any[] = Array.isArray(reqRes) ? reqRes : (reqRes as any)?.data ?? [];
      const uploadedDocs: any[] = Array.isArray(docsRes) ? docsRes : (docsRes as any)?.data ?? [];

      const docList: DocumentItem[] = requirements.map((req: any) => {
        const uploaded = uploadedDocs.find(
          (d: any) =>
            d.documentTypeId === req.id ||
            d.documentType?.name === req.name ||
            d.documentType?.category === req.category ||
            d.category === req.category
        );
        if (uploaded) {
          const isExpired = uploaded.expirationDate && new Date(uploaded.expirationDate) < new Date();
          const apiStatus = (uploaded.status ?? '').toLowerCase();
          let status: DocumentItem["status"] = apiStatus === 'approved' ? 'approved'
            : apiStatus === 'pending' ? 'pending'
            : apiStatus === 'rejected' ? 'rejected'
            : isExpired ? 'expired'
            : 'uploaded';
          return {
            id: uploaded.id,
            name: req.name,
            status,
            filePath: uploaded.filePath ?? uploaded.s3Key,
            fileName: uploaded.fileName,
            expirationDate: uploaded.expirationDate,
            uploadedAt: uploaded.createdAt,
          };
        }
        return {
          id: req.id,
          name: req.name,
          status: "missing" as const,
        };
      });

      setDocuments(docList);
    } catch (error) {
      console.error("Error loading person data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc: DocumentItem) => {
    if (!doc.id || doc.status === 'missing') return;
    try {
      const res: any = await documentService.getDownloadUrl(doc.id);
      const url = res?.url ?? res?.signedUrl ?? res;
      if (url && typeof url === 'string') {
        setSelectedDoc({ url, name: doc.fileName || doc.name });
        setViewerOpen(true);
      }
    } catch (error) {
      console.error("Error getting document URL:", error);
    }
  };

  const handleDownloadDocument = async (doc: DocumentItem) => {
    if (!doc.id || doc.status === 'missing') return;
    try {
      const res: any = await documentService.getDownloadUrl(doc.id);
      const url = res?.url ?? res?.signedUrl ?? res;
      if (url && typeof url === 'string') {
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.fileName || doc.name;
        link.click();
      }
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const getStatusBadge = (status: DocumentItem["status"]) => {
    switch (status) {
      case "approved":
      case "uploaded":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {status === "approved" ? "Approved" : "Uploaded"}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case "missing":
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Person not found</p>
        <Button variant="link" onClick={() => navigate('/all-documents')}>
          All documents
        </Button>
      </div>
    );
  }

  const uploadedCount = documents.filter((d) => d.status !== "missing").length;
  const totalCount = documents.length;
  const completionPercent = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;
  const initials = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-end">
        <ExportAllButton
          personId={person.id}
          personName={`${person.lastName}_${person.firstName}`}
          personType={person.type}
          documents={documents.filter((d) => d.filePath)}
        />
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-20 w-20 shrink-0 ring-4 ring-background shadow-lg mx-auto sm:mx-0">
              <AvatarFallback
                className={cn(
                  "text-xl font-semibold",
                  isStudent
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-purple-500/10 text-purple-600"
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">
                {person.firstName} {person.lastName}
              </h1>
              <p className="text-muted-foreground capitalize mb-4">{person.type}</p>

              <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-muted-foreground">
                {person.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {person.email}
                  </span>
                )}
                {person.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {person.phone}
                  </span>
                )}
                {person.dateOfBirth && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(person.dateOfBirth), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>

            {/* Completion */}
            <div className="w-full sm:w-48 shrink-0">
              <div className="text-center sm:text-right mb-2">
                <span className="text-3xl font-bold">{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-center sm:text-right">
                {uploadedCount} of {totalCount} documents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      doc.status === "missing"
                        ? "bg-muted"
                        : "bg-primary/10"
                    )}
                  >
                    <FileText
                      className={cn(
                        "h-5 w-5",
                        doc.status === "missing"
                          ? "text-muted-foreground"
                          : "text-primary"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    {doc.expirationDate && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {format(new Date(doc.expirationDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(doc.status)}

                  {doc.filePath ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewDocument(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1">
                      <Upload className="h-3 w-3" />
                      Upload
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No documents required</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted rounded-lg">
            {selectedDoc?.url && (
              <iframe
                src={selectedDoc.url}
                className="w-full h-full border-0"
                title={selectedDoc.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

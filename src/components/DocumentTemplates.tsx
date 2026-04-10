import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Trash2, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number;
  is_system_template: boolean;
  download_count: number;
  created_at: string;
}

interface DocumentTemplatesProps {
  schoolId: string;
}

const DOCUMENT_CATEGORIES = [
  { value: "immunization_records", label: "Immunization Records" },
  { value: "health_forms", label: "Health Forms" },
  { value: "emergency_contacts", label: "Emergency Contacts" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "proof_of_residence", label: "Proof of Residence" },
  { value: "medical_records", label: "Medical Records" },
];

export const DocumentTemplates = ({ schoolId }: DocumentTemplatesProps) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [schoolId]);

  const fetchTemplates = async () => {
    try {
      const data = await api.get(`/document-templates?schoolId=${schoolId}`);
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error loading templates",
        description: "Failed to load document templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile || !templateName || !templateCategory) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', templateFile);
      formData.append('name', templateName);
      formData.append('description', templateDescription || '');
      formData.append('category', templateCategory);
      formData.append('schoolId', schoolId);

      const token = localStorage.getItem('access_token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/document-templates`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errData.message || 'Upload failed');
      }

      toast({
        title: "Template uploaded",
        description: "Document template has been added successfully",
      });

      // Reset form
      setTemplateName("");
      setTemplateDescription("");
      setTemplateCategory("");
      setTemplateFile(null);
      setIsDialogOpen(false);
      
      fetchTemplates();
    } catch (error: any) {
      console.error("Error uploading template:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload template",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async (template: DocumentTemplate) => {
    try {
      const { url } = await api.get(`/document-templates/${template.id}/download-url`);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = template.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      await api.patch(`/document-templates/${template.id}`, {
        download_count: template.download_count + 1,
      });

      toast({
        title: "Template downloaded",
        description: `${template.name} has been downloaded`,
      });

      fetchTemplates();
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Download failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (template: DocumentTemplate) => {
    if (template.is_system_template) {
      toast({
        title: "Cannot delete",
        description: "System templates cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.delete(`/document-templates/${template.id}`);

      toast({
        title: "Template deleted",
        description: "Document template has been removed",
      });

      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading templates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Templates
            </CardTitle>
            <CardDescription>
              Pre-made forms and documents for common enrollment requirements
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document Template</DialogTitle>
                <DialogDescription>
                  Add a new template that can be shared with parents
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadTemplate} className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., NYC Immunization Form"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="templateCategory">Category *</Label>
                  <Select value={templateCategory} onValueChange={setTemplateCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="templateFile">File *</Label>
                  <Input
                    id="templateFile"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, or image files (max 10MB)
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? (
                      <>Uploading...</>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No templates available yet</p>
            <p className="text-sm">Upload your first template to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{template.name}</h4>
                    {template.is_system_template && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {DOCUMENT_CATEGORIES.find((c) => c.value === template.category)?.label}
                    </span>
                    <span>{(template.file_size / 1024).toFixed(1)} KB</span>
                    <span>{template.download_count} downloads</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadTemplate(template)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!template.is_system_template && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
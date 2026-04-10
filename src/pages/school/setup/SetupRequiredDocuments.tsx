import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { documentTypeService } from "@/services/documentTypeService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, FileText, Trash2, CheckCircle, Loader2 } from "lucide-react";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface RequiredDocument {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
}

const DOCUMENT_CATEGORIES = [
  { value: 'immunization_records', label: 'Immunization Records' },
  { value: 'health_forms', label: 'Health Forms' },
  { value: 'emergency_contacts', label: 'Emergency Contacts' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'proof_of_residence', label: 'Proof of Residence' },
  { value: 'medical_records', label: 'Medical Records' },
];

const DEFAULT_NYC_DOCUMENTS = [
  { name: 'Immunization Record (CH-205)', category: 'immunization_records', description: 'NYC DOH immunization form', is_mandatory: true },
  { name: 'Health Examination Form', category: 'health_forms', description: 'Annual physical examination record', is_mandatory: true },
  { name: 'Emergency Contact Form', category: 'emergency_contacts', description: 'Primary and alternate contacts', is_mandatory: true },
  { name: 'Allergy Action Plan', category: 'medical_records', description: 'Required if child has allergies', is_mandatory: false },
  { name: 'Birth Certificate', category: 'birth_certificate', description: 'Proof of age/identity', is_mandatory: true },
  { name: 'Proof of Residence', category: 'proof_of_residence', description: 'Utility bill or lease agreement', is_mandatory: true },
];

const SetupRequiredDocuments = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, schoolId, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New document form state
  const [newDoc, setNewDoc] = useState({
    name: '',
    category: 'health_forms',
    description: '',
    is_mandatory: true,
  });

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (isParent) { navigate('/dashboard', { replace: true }); return; }
    if (!canManageSchool) { navigate('/not-authorized', { replace: true }); return; }
    
    fetchData();
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate]);

  const fetchData = async () => {
    if (!schoolId) {
      navigate('/school-register');
      return;
    }

    try {
      const docs = await documentTypeService.list({ schoolId });
      setDocuments(docs || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addDefaultDocuments = async () => {
    if (!schoolId) return;
    setSaving(true);
    
    try {
      await Promise.all(
        DEFAULT_NYC_DOCUMENTS.map(doc =>
          documentTypeService.create({
            ...doc,
            schoolId,
            isActive: true,
          })
        )
      );

      toast({ title: 'Default documents added', description: 'NYC DOH required documents have been added' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding default documents:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocument = async () => {
    if (!schoolId || !newDoc.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a document name', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await documentTypeService.create({
        name: newDoc.name.trim(),
        category: newDoc.category,
        description: newDoc.description.trim() || null,
        isMandatory: newDoc.is_mandatory,
        schoolId,
        isActive: true,
      });

      toast({ title: 'Document added', description: `${newDoc.name} has been added to requirements` });
      setNewDoc({ name: '', category: 'health_forms', description: '', is_mandatory: true });
      setShowAddForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Error adding document:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await documentTypeService.remove(id);

      toast({ title: 'Document removed' });
      setDocuments(documents.filter(d => d.id !== id));
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (authLoading || roleLoading || loading) {
    return <LoadingSpinner />;
  }

  const categoryLabel = (value: string) => 
    DOCUMENT_CATEGORIES.find(c => c.value === value)?.label || value;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container px-4 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/school-dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              Setup Required Documents
            </h1>
            <p className="text-muted-foreground">
              Define which documents parents must submit for their children.
              {documents.length >= 3 && (
                <Badge className="ml-2 bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Step Complete
                </Badge>
              )}
            </p>
          </div>

          {/* Quick Start */}
          {documents.length === 0 && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>
                  Add NYC DOH required documents with one click
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={addDefaultDocuments} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Default NYC Documents
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Document List */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Required Documents ({documents.length})
                  </CardTitle>
                  <CardDescription>
                    {documents.length < 3 
                      ? `Add at least ${3 - documents.length} more document types to complete this step`
                      : 'Parents will be required to upload these documents'}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddForm(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No documents defined yet. Add some using the button above or use the quick start.
                </p>
              ) : (
                documents.map(doc => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.name}</p>
                        {doc.is_mandatory && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {categoryLabel(doc.category)}
                        {doc.description && ` · ${doc.description}`}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Add Document Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Document Requirement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-name">Document Name *</Label>
                  <Input
                    id="doc-name"
                    placeholder="e.g., Physical Examination Form"
                    value={newDoc.name}
                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-category">Category</Label>
                  <Select
                    value={newDoc.category}
                    onValueChange={(value) => setNewDoc({ ...newDoc, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-description">Description (optional)</Label>
                  <Textarea
                    id="doc-description"
                    placeholder="Describe what this document should contain..."
                    value={newDoc.description}
                    onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="doc-mandatory"
                    checked={newDoc.is_mandatory}
                    onCheckedChange={(checked) => setNewDoc({ ...newDoc, is_mandatory: checked })}
                  />
                  <Label htmlFor="doc-mandatory">Mandatory document</Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDocument} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Continue Button */}
          {documents.length >= 3 && (
            <div className="flex justify-end mt-6">
              <Button onClick={() => navigate('/school/setup/staff')}>
                Continue to Staff Setup
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupRequiredDocuments;

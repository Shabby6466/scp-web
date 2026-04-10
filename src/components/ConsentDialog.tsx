import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const ConsentDialog = ({ open, onOpenChange, onAccept }: ConsentDialogProps) => {
  const [ferpaConsent, setFerpaConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [dataStorageConsent, setDataStorageConsent] = useState(false);

  const allConsentsGiven = ferpaConsent && privacyConsent && dataStorageConsent;

  const handleAccept = () => {
    if (allConsentsGiven) {
      onAccept();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Privacy & Consent Agreement</DialogTitle>
              <DialogDescription>
                Required for FERPA & NYC DOH compliance
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6">
            {/* FERPA Notice */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                FERPA Rights & Notice
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  The Family Educational Rights and Privacy Act (FERPA) affords parents certain rights with respect to their children's education records:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>The right to inspect and review your child's education records</li>
                  <li>The right to request amendment of records you believe are inaccurate</li>
                  <li>The right to consent to disclosures of personally identifiable information</li>
                  <li>The right to file a complaint with the U.S. Department of Education</li>
                </ul>
              </div>
            </div>

            {/* NYC DOH Requirements */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                NYC Department of Health Requirements
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  In compliance with NYC Department of Health regulations, we collect and maintain:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Immunization records for disease prevention and outbreak control</li>
                  <li>Health assessments to ensure child safety and appropriate care</li>
                  <li>Emergency contact information for critical situations</li>
                  <li>Medical information necessary for proper care and accommodation</li>
                </ul>
              </div>
            </div>

            {/* Data Protection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Data Protection & Security
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  We protect your family's information through:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Encrypted storage of all documents and personal information</li>
                  <li>Secure, role-based access controls</li>
                  <li>Regular security audits and compliance reviews</li>
                  <li>Staff training on privacy and confidentiality</li>
                  <li>Limited retention periods and secure data disposal</li>
                </ul>
              </div>
            </div>

            {/* Information We Collect */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Information We Collect</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Student Information:</strong> Name, date of birth, grade level</li>
                  <li><strong>Parent/Guardian Information:</strong> Name, contact information, relationship to child</li>
                  <li><strong>Medical Records:</strong> Immunizations, health forms, medical history</li>
                  <li><strong>Identity Documents:</strong> Birth certificate, proof of residence</li>
                  <li><strong>Emergency Information:</strong> Contacts, authorized pickup persons</li>
                </ul>
              </div>
            </div>

            {/* How We Use Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">How We Use Your Information</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Enrollment processing and attendance tracking</li>
                  <li>Health and safety compliance monitoring</li>
                  <li>Emergency response and parent communication</li>
                  <li>Regulatory reporting to NYC DOH and other authorities</li>
                  <li>Educational planning and appropriate accommodations</li>
                </ul>
              </div>
            </div>

            {/* Consent Items */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Required:</strong> All consents must be given to proceed with enrollment and document management.
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>

        <div className="space-y-4 mt-4 flex-shrink-0">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="ferpa"
                checked={ferpaConsent}
                onCheckedChange={(checked) => setFerpaConsent(checked as boolean)}
              />
              <label
                htmlFor="ferpa"
                className="text-sm font-medium leading-tight cursor-pointer"
              >
                I acknowledge my FERPA rights and consent to the collection and storage of my child's educational records
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacyConsent}
                onCheckedChange={(checked) => setPrivacyConsent(checked as boolean)}
              />
              <label
                htmlFor="privacy"
                className="text-sm font-medium leading-tight cursor-pointer"
              >
                I consent to the collection and use of personal and medical information as described above for enrollment, health compliance, and safety purposes
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="storage"
                checked={dataStorageConsent}
                onCheckedChange={(checked) => setDataStorageConsent(checked as boolean)}
              />
              <label
                htmlFor="storage"
                className="text-sm font-medium leading-tight cursor-pointer"
              >
                I understand how my data will be protected and stored, and consent to secure digital storage of documents containing sensitive information
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleAccept}
              disabled={!allConsentsGiven}
              size="lg"
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Accept & Continue
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentDialog;

import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-accent/40 via-background to-accent/20">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <FileText className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
              Terms of Service
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              Last Updated: January 2024
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="container px-4">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12 space-y-8">

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Agreement to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms of Service constitute a legally binding agreement between you and SCP ("Company," "we," "us," or "our") concerning your access to and use of the SCP platform. By accessing or using our services, you agree that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not access or use our services.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Eligibility</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are intended for use by educational institutions, schools, preschools, and authorized parents/guardians. By using our services, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. If you are using the service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Account Registration</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To access certain features of our service, you must register for an account. When you register, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security of your password and account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Acceptable Use</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree to use our services only for lawful purposes and in accordance with these Terms. You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe upon the rights of others</li>
                  <li>Upload viruses, malware, or other malicious code</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the service or servers</li>
                  <li>Engage in any automated use of the system</li>
                  <li>Use the service to transmit spam or unsolicited communications</li>
                  <li>Impersonate any person or entity</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Subscription and Payment</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Our services are provided on a subscription basis. By subscribing, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Pay all fees associated with your subscription plan</li>
                  <li>Provide accurate billing information</li>
                  <li>Automatic renewal of your subscription unless cancelled</li>
                  <li>Price changes with 30 days advance notice</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  All fees are non-refundable except as required by law or as explicitly stated in these Terms. You may cancel your subscription at any time, but no refunds will be provided for partial subscription periods.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">User Content</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You retain ownership of all content and documents you upload to our service ("User Content"). By uploading User Content, you grant us a limited license to store, process, and display your content solely for the purpose of providing our services to you.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  You are solely responsible for your User Content and represent that you have all necessary rights to upload and share such content. We reserve the right to remove any content that violates these Terms or applicable laws.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Intellectual Property Rights</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The service and its original content (excluding User Content), features, and functionality are owned by SCP and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our services or software without our express written permission.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Data Protection and Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We are committed to protecting your data in accordance with our Privacy Policy and applicable data protection laws, including HIPAA where applicable. We implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk. For more information, please review our Privacy Policy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Service Availability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We strive to provide continuous availability of our services but do not guarantee uninterrupted access. We may suspend or terminate access for maintenance, updates, or unforeseen circumstances. We are not liable for any interruption of service or loss of data resulting from service unavailability.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify, defend, and hold harmless SCP and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising out of or related to your use of the service, violation of these Terms, or infringement of any rights of another party.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the service will cease immediately. You may terminate your account at any time by contacting us or through your account settings.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Dispute Resolution</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Any disputes arising from these Terms or your use of the service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive any right to participate in a class action lawsuit or class-wide arbitration.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the State of New York, United States, without regard to its conflict of law provisions.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on our website and updating the "Last Updated" date. Your continued use of the service after such changes constitutes acceptance of the modified Terms.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us at:
                </p>
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Email:</strong> legal@SCP.com<br />
                    <strong className="text-foreground">Phone:</strong> (888) 555-1234<br />
                    <strong className="text-foreground">Mail:</strong> SCP Legal Department, 123 Document Lane, Suite 100, New York, NY 10001
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default TermsOfService;
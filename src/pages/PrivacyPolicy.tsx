import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
const PrivacyPolicy = () => {
  return <div className="min-h-screen bg-background">
    <Header />
    {/* Hero Section */}
    <section className="py-20 bg-gradient-to-br from-accent/40 via-background to-accent/20">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-display font-bold mb-6 text-foreground md:text-7xl">
            Privacy Policy
          </h1>

        </div>
      </div>
    </section>

    {/* Content Section */}
    <section className="py-16">
      <div className="container px-4">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 md:p-12 space-y-8">

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                SCP ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our document management platform. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Information We Collect</h2>
              <h3 className="text-xl font-bold mb-3 text-foreground">Personal Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Name, email address, and phone number</li>
                <li>School or institution information</li>
                <li>Student names and dates of birth</li>
                <li>Document files and associated metadata</li>
                <li>Payment and billing information</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Automatically Collected Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you access our service, we automatically collect certain information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Log data (IP address, browser type, operating system)</li>
                <li>Usage information (pages viewed, time spent, features used)</li>
                <li>Device information</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative information, updates, and security alerts</li>
                <li>Respond to comments, questions, and provide customer support</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues and fraudulent activity</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">HIPAA Compliance</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                SCP is committed to maintaining HIPAA compliance for Protected Health Information (PHI). We implement appropriate administrative, physical, and technical safeguards to protect PHI, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>End-to-end encryption for data in transit and at rest</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Regular security audits and risk assessments</li>
                <li>Staff training on privacy and security procedures</li>
                <li>Business Associate Agreements with third-party service providers</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Information Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>With your consent:</strong> When you authorize us to share information</li>
                <li><strong>Service providers:</strong> With third-party vendors who perform services on our behalf</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business transfers:</strong> In connection with a merger, sale, or acquisition</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your information, including encryption, firewalls, secure socket layer technology (SSL), and regular security assessments. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law. When you delete your account, we will delete or anonymize your personal information within 90 days, except where we are required to retain it for legal purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access and receive a copy of your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to or restrict certain processing of your information</li>
                <li>Withdraw consent where processing is based on consent</li>
                <li>File a complaint with a supervisory authority</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service is designed for use by educational institutions and parents/guardians. While we store information about students, we do not knowingly collect personal information directly from children under 13 without parental consent. Parents and guardians control access to student information through the platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Email:</strong> privacy@SCP.com<br />
                  <strong className="text-foreground">Phone:</strong> (888) 555-1234<br />
                  <strong className="text-foreground">Mail:</strong> SCP Privacy Team, 123 Document Lane, Suite 100, New York, NY 10001
                </p>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </section>
    <Footer />
  </div>;
};
export default PrivacyPolicy;
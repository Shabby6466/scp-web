import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FAQ = () => {
  const faqs = [
    {
      question: "What is LittleLedger?",
      answer: "LittleLedger is a comprehensive document management system designed specifically for preschools and early childhood education centers. We help you digitize, organize, and manage student documents securely while staying compliant with regulations."
    },
    {
      question: "Is LittleLedger HIPAA compliant?",
      answer: "Yes! LittleLedger is fully HIPAA compliant. We use industry-leading security measures including end-to-end encryption, secure data centers, and strict access controls to protect sensitive student and family information."
    },
    {
      question: "How do parents access their documents?",
      answer: "Parents receive secure login credentials and can access their student's documents 24/7 through our parent portal. They can view, download, and upload documents from any device with an internet connection."
    },
    {
      question: "What types of documents can I store?",
      answer: "You can store all types of student documents including immunization records, health forms, emergency contacts, birth certificates, proof of residence, medical records, and more. We support PDF, images, and other common file formats."
    },
    {
      question: "How much does LittleLedger cost?",
      answer: "We offer flexible pricing plans based on your school's size and needs. Visit our Pricing page or contact us for a customized quote. All plans include secure storage, parent access, and compliance features."
    },
    {
      question: "Can I try LittleLedger before committing?",
      answer: "Absolutely! We offer a free trial period so you can experience all features before making a decision. Contact us to get started with your trial."
    },
    {
      question: "How long does implementation take?",
      answer: "Most schools are up and running within 1-2 weeks. Our team provides full onboarding support, training, and helps with initial document migration to make the transition smooth."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "You maintain full ownership of your data. Before cancellation, you can export all documents and data. We also provide a grace period for data retrieval after cancellation."
    },
    {
      question: "Do you provide training for staff?",
      answer: "Yes! We provide comprehensive training for all staff members, including video tutorials, live training sessions, and ongoing support to ensure everyone is comfortable using the system."
    },
    {
      question: "Can parents upload documents directly?",
      answer: "Yes! Parents can upload required documents directly through their portal, which are then reviewed and approved by your staff. This saves time and eliminates the need for physical document collection."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-accent/40 via-background to-accent/20">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <span className="text-sm font-semibold text-primary tracking-wide">SUPPORT CENTER</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              Find answers to common questions about LittleLedger. Can't find what you're looking for? Contact our support team.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container px-4">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left font-semibold text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-display font-bold mb-4 text-foreground">
              Still Have Questions?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 font-medium">
              Our support team is here to help you get the most out of LittleLedger.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-bold mb-2 text-foreground">Email Support</h3>
                  <a href="mailto:support@littleledger.com" className="text-primary hover:underline font-medium">
                    support@littleledger.com
                  </a>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-bold mb-2 text-foreground">Phone Support</h3>
                  <a href="tel:+18885551234" className="text-primary hover:underline font-medium">
                    (888) 555-1234
                  </a>
                </CardContent>
              </Card>
            </div>
            
            <Button size="lg" className="bg-brandred text-white hover:bg-brandred/90" onClick={() => window.location.href = 'mailto:support@littleledger.com'}>
              Contact Support Team
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default FAQ;
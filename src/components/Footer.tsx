import { Link } from "react-router-dom";
import logo from "@/assets/logo-new.jpg";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card">
      <div className="container py-12 md:py-16">
        <div className="grid md:grid-cols-12 gap-8 md:gap-12 mb-10">
          {/* Brand Section */}
          <div className="md:col-span-5">
            <div className="flex items-center mb-4">
              <img
                src={logo}
                alt="SCP"
                className="h-10 w-auto object-contain rounded-md"
              />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Streamlining document management for preschools and families.
              Secure, compliant, and trusted by Manhattan schools.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="font-semibold mb-4 text-sm text-foreground">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2">
            <h4 className="font-semibold mb-4 text-sm text-foreground">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h4 className="font-semibold mb-4 text-sm text-foreground">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:support@SCP.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  support@SCP.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+18885551234"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  (888) 555-1234
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-6 border-t border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2026 SCP. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                HIPAA Compliant
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                256-bit Encryption
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

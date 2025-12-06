import Link from 'next/link';
import { Sparkles, Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    support: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Submit Ticket', href: '/support/ticket' },
      { label: 'Status Page', href: '/status' },
      { label: 'Contact Us', href: '/contact' },
    ],
    resources: [
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Integrations', href: '/docs/integrations' },
      { label: 'Release Notes', href: '/docs/release-notes' },
    ],
    company: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  };

  return (
    <footer className="bg-surface-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-semibold">
                Support<span className="text-primary-400">Hub</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-surface-400 leading-relaxed">
              Intelligent customer support powered by Contentstack, Lytics, and personalized experiences.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="mailto:support@example.com"
                className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-surface-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-surface-500">
              © {currentYear} SupportHub. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-sm text-surface-500">
              <span>Powered by</span>
              <span className="text-primary-400 font-medium">Contentstack</span>
              <span>+</span>
              <span className="text-accent-mint font-medium">Lytics</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


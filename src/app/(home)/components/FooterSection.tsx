import Link from "next/link";
import { Sparkles, Twitter, Github, Linkedin } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "Benefits", href: "#benefits" },
      { name: "Pricing", href: "#pricing" },
      { name: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Contact", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Documentation", href: "#" },
      { name: "Help Center", href: "#" },
      { name: "Privacy", href: "#" },
      { name: "Terms", href: "#" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export default function FooterSection() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('/wave-pattern.svg')] bg-repeat opacity-5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_-100%,#3b0764,transparent)]" />
      <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="container relative mx-auto px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-xl font-bold"
            >
              <Sparkles className="h-5 w-5 text-purple-500 transition-transform duration-300 group-hover:rotate-12" />
              <span className="bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                AI Planner
              </span>
            </Link>
            <p className="text-sm text-purple-100/60">
              Transform your productivity with intelligent planning and
              AI-powered insights.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="text-purple-100/60 transition-colors hover:text-purple-400"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {footerLinks.map((column) => (
            <div key={column.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-purple-100">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-purple-100/60 transition-colors hover:text-purple-400"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-purple-500/10 pt-8 text-sm text-purple-100/60 sm:flex-row">
          <p>© 2024 AI Planner. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-purple-400">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-purple-400">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-purple-400">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

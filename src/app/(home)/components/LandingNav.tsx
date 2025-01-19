"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigationItems = [
    { label: "Features", href: "#features" },
    { label: "Benefits", href: "#benefits" },
    // { label: "Pricing", href: "#pricing" },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-purple-500/10 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60"
          : "bg-transparent",
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2 text-xl font-bold"
          >
            <Sparkles className="h-5 w-5 text-purple-500 transition-transform duration-300 group-hover:rotate-12" />
            <span className="bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
              AI Planner
            </span>
          </Link>

          {/* Mobile menu button */}
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-purple-100/10 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-4 w-4 text-purple-100" />
            ) : (
              <Menu className="h-4 w-4 text-purple-100" />
            )}
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:gap-8">
            <nav className="flex items-center space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative text-sm font-medium text-purple-100/80 transition-colors hover:text-purple-100"
                >
                  <span className="relative">
                    {item.label}
                    <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-purple-500 transition-all duration-300 group-hover:w-full" />
                  </span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="border-purple-500/50 text-sm font-medium text-purple-100 transition-all duration-300 hover:border-purple-500 hover:bg-purple-500/10 hover:text-purple-100"
              >
                <Link href="/dashboard">Log In</Link>
              </Button>
              <Button
                asChild
                className="gap-2 bg-purple-600 text-white transition-all duration-300 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/20"
              >
                <Link href="/dashboard">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "fixed inset-x-0 top-16 h-[calc(100vh-64px)] transform overflow-y-auto bg-gray-950/95 backdrop-blur transition-transform duration-300 ease-in-out md:hidden",
            isMenuOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="container space-y-8 p-6">
            <nav className="flex flex-col space-y-6">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-lg font-medium text-purple-100/80 transition-colors hover:text-purple-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-4 pt-6">
              <Button
                asChild
                variant="outline"
                className="w-full justify-center border-purple-500/50 text-purple-100 transition-all duration-300 hover:border-purple-500 hover:bg-purple-500/10 hover:text-purple-100"
              >
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  Log In
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
              >
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

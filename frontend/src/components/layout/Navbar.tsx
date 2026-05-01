"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Menu, X, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

interface HealthResponse {
  status: string;
  backend_status?: string;
  model?: string;
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then((data: HealthResponse) => {
        setModelInfo(data.model || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "RESEARCH" },
    { href: "/history", label: "HISTORY" },
    { href: "/settings", label: "SETTINGS" },
  ];

  return (
    <>
      {/* Top Bar - 48px height, dense terminal aesthetic */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#080808] border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex justify-between items-center px-4 md:px-6 h-12">
          {/* Logo - text mark only */}
          <Link href="/" className="font-display text-[15px] font-bold text-[#F8F8F8] tracking-tight">
            RESEARCHMIND
          </Link>

          {/* Desktop Nav - mono uppercase */}
          <div className="hidden md:flex gap-6 items-center">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || 
                (link.href !== "/" && pathname.startsWith(link.href));
              
              return (
                <Link 
                  key={link.href}
                  href={link.href}
                  className={`font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    isActive 
                      ? "text-[#00D9FF]" 
                      : "text-[#8A8A8A] hover:text-[#F8F8F8]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            
            <div className="h-3 w-px bg-[rgba(255,255,255,0.08)]" />
            
            {/* API Provider badge */}
            <span className="font-mono text-[11px] text-[#484848]">
              {modelInfo || "CONNECTING..."}
            </span>
            
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{ 
                  elements: { 
                    userButtonAvatarBox: "w-7 h-7 border border-[rgba(255,255,255,0.08)]" 
                  } 
                }} 
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#F8F8F8] transition-colors">
                  [SIGN IN]
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#8A8A8A] hover:text-[#F8F8F8] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu - flat, dense */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 top-12 z-40 bg-[#020202] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={`fixed top-12 left-0 right-0 z-50 bg-[#080808] border-b border-[rgba(255,255,255,0.04)] md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="flex flex-col">
          {/* New Research Button */}
          <Link 
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="bg-[#00D9FF] text-[#020202] font-mono text-[13px] font-semibold uppercase tracking-[0.05em] py-3 px-4 flex items-center justify-center gap-2 m-4"
          >
            <Plus className="w-4 h-4" />
            INITIATE RESEARCH
          </Link>

          {/* Navigation Links */}
          {navLinks.map((link) => {
            const isActive = pathname === link.href || 
              (link.href !== "/" && pathname.startsWith(link.href));
            
            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-3 px-4 font-mono text-[13px] uppercase tracking-[0.05em] transition-colors border-b border-[rgba(255,255,255,0.04)] ${
                  isActive 
                    ? "text-[#00D9FF] bg-[#0F0F0F]" 
                    : "text-[#8A8A8A] hover:text-[#F8F8F8] hover:bg-[#0F0F0F]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* External Links */}
          <a 
            href="https://github.com/yourusername/researchmind" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8A8A8A] hover:text-[#F8F8F8] transition-colors py-3 px-4 font-mono text-[13px] flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)]"
          >
            GITHUB
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>

          {/* User Section */}
          <div className="p-4">
            <SignedIn>
              <div className="flex items-center gap-3">
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{ 
                    elements: { 
                      userButtonAvatarBox: "w-8 h-8 border border-[rgba(255,255,255,0.08)]" 
                    } 
                  }} 
                />
                <span className="font-mono text-[13px] text-[#8A8A8A]">[ACCOUNT]</span>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full text-left font-mono text-[13px] uppercase tracking-[0.05em] text-[#8A8A8A] hover:text-[#F8F8F8] py-3">
                  [SIGN IN]
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </nav>
      </div>
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Menu, X, ArrowRight } from 'lucide-react';
import { GlassButton } from '../glass/GlassButton';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLeft = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Reconciliation', href: '/reconciliation' },
    { label: 'Agents', href: '/agents' },
  ];

  const navRight = [
    { label: 'Exceptions', href: '/exceptions' },
    { label: 'Evidence', href: '/evidence' },
    { label: 'Replay', href: '/replay' },
  ];

  const allLinks = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Reconciliation', href: '/reconciliation' },
    { label: 'AI Agents', href: '/agents' },
    { label: 'Exceptions', href: '/exceptions' },
    { label: 'Evidence', href: '/evidence' },
    { label: 'Replay', href: '/replay' },
    { label: 'Architecture', href: '/architecture' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pt-4 pointer-events-none">
        <nav
          className={`pointer-events-auto transition-all duration-300 ease-out flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 rounded-full ${
            isScrolled
              ? 'glass-pill bg-[#0B111D]/85 border-white/15 shadow-glass-pill'
              : 'bg-[#0B111D]/45 backdrop-blur-md border border-white/10 shadow-lg'
          } max-w-[960px] w-full`}
        >
          {/* Left Nav links (Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-3 flex-1 justify-end mr-4">
            {navLeft.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 text-xs lg:text-sm font-medium tracking-wide transition-colors rounded-full ${
                    active
                      ? 'text-white bg-white/10 font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Center Brand / Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/5 transition-all shrink-0 group"
          >
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent group-hover:scale-105 transition-transform shadow-glow-sm">
              <ShieldCheck className="w-4 h-4 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold tracking-wider text-white font-mono uppercase">
                REALM <span className="text-accent">VERIFY</span>
              </span>
            </div>
          </Link>

          {/* Right Nav links (Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-3 flex-1 justify-start ml-4">
            {navRight.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 text-xs lg:text-sm font-medium tracking-wide transition-colors rounded-full ${
                    active
                      ? 'text-white bg-white/10 font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-background/90 backdrop-blur-xl"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={`absolute top-20 left-4 right-4 p-6 glass-panel rounded-3xl border border-white/15 transition-all duration-300 ${
            mobileMenuOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-95'
          }`}
        >
          <div className="flex flex-col gap-2">
            {allLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    active
                      ? 'text-accent bg-accent/15 border border-accent/30 font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-4 h-4 opacity-50" />
                </Link>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
            <Link href="/reconciliation" onClick={() => setMobileMenuOpen(false)}>
              <GlassButton variant="primary" size="md" className="w-full">
                Run Reconciliation
              </GlassButton>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

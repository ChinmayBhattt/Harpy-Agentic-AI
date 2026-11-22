"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cdn } from "@/lib/cdn";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact Us" },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (
    pathname?.startsWith("/dashbord") ||
    pathname?.startsWith("/dashboard") ||
    pathname === "/started"
  ) {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-obsidian/85 border-b border-gold/15 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        >
          {/* Harpy Official Logo */}
          <div className="relative w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center bg-obsidian-light/80 p-1.5 group-hover:border-gold transition-colors duration-300 shadow-[0_0_15px_rgba(198,164,106,0.15)]">
            <Image
              src={cdn("/images/harpy-logo-light.png")}
              alt="HARPY AI Logo"
              width={34}
              height={34}
              className="object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_2px_8px_rgba(198,164,106,0.3)]"
              priority
            />
            <div className="absolute inset-0 rounded-full border border-gold/20 scale-125 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="flex flex-col">
            <span className="font-cinzel text-lg tracking-[0.22em] text-parchment group-hover:text-gold transition-colors duration-300">
              HARPY
            </span>
            <span className="font-inter text-[9px] uppercase tracking-[0.35em] text-gold/70 -mt-1">
              Artificial Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-cormorant text-lg tracking-wider transition-colors duration-200 py-1 ${
                  isActive ? "text-gold font-medium" : "text-parchment/75 hover:text-parchment"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-gradient-to-r from-gold/20 via-gold to-gold/20"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-4">
          {userEmail ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashbord"
                className="px-5 py-2 text-xs font-cinzel tracking-[0.18em] uppercase bg-gold text-obsidian font-semibold hover:bg-[#E2C99A] transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(198,164,106,0.3)] flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <span className="text-[10px]">↗</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="text-[11px] font-cinzel tracking-wider text-parchment/50 hover:text-gold uppercase transition-colors"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/started"
              className="px-5 py-2 text-xs font-cinzel tracking-[0.18em] uppercase border border-gold/50 text-gold hover:bg-gold hover:text-obsidian transition-all duration-300 rounded-none shadow-sm hover:shadow-[0_0_15px_rgba(198,164,106,0.2)]"
            >
              Get Started
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-parchment p-2 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6 text-gold" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-gold/20 bg-obsidian-light/95 backdrop-blur-xl px-6 py-8"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`font-cormorant text-2xl tracking-wide flex items-center justify-between py-2 border-b border-gold/10 ${
                      isActive ? "text-gold font-semibold" : "text-parchment/80 hover:text-gold"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && <span className="text-gold text-sm font-cinzel">✦</span>}
                  </Link>
                );
              })}
              {userEmail ? (
                <div className="flex flex-col gap-2 mt-4">
                  <Link
                    href="/dashbord"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-3 text-xs font-cinzel tracking-[0.2em] uppercase bg-gold text-obsidian font-semibold"
                  >
                    Enter Dashboard ↗
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="text-center py-2 text-xs font-cinzel tracking-[0.2em] uppercase text-parchment/60 hover:text-gold"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/started"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-4 text-center py-3 text-xs font-cinzel tracking-[0.2em] uppercase bg-gold text-obsidian font-semibold"
                >
                  Get Started
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

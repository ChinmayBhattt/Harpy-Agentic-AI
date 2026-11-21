"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact Us" },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-obsidian/85 border-b border-gold/15 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        >
          {/* Harpy Crest Icon */}
          <div className="relative w-9 h-9 rounded-full border border-gold/40 flex items-center justify-center bg-obsidian-light/60 group-hover:border-gold transition-colors duration-300">
            <svg
              className="w-5 h-5 text-gold transition-transform duration-500 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {/* Winged Crest / Harpy Motif */}
              <path d="M12 2C8 6 3 9 3 14a9 9 0 0 0 18 0c0-5-5-8-9-12z" strokeOpacity="0.4" />
              <path d="M12 5c-3 3-6 5-6 9a6 6 0 0 0 12 0c0-4-3-6-6-9z" />
              <circle cx="12" cy="14" r="1.5" fill="currentColor" />
            </svg>
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
          <Link
            href="/contact"
            className="px-5 py-2 text-xs font-cinzel tracking-[0.18em] uppercase border border-gold/40 text-gold hover:bg-gold hover:text-obsidian transition-all duration-300 rounded-none shadow-sm hover:shadow-[0_0_15px_rgba(198,164,106,0.2)]"
          >
            Initiate Contact
          </Link>
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
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 text-center py-3 text-xs font-cinzel tracking-[0.2em] uppercase bg-gold text-obsidian font-semibold"
              >
                Initiate Contact
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

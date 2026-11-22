"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cdn } from "@/lib/cdn";
import { usePathname } from "next/navigation";
import { GreekDivider } from "./GreekDivider";

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashbord") || pathname?.startsWith("/dashboard")) {
    return null;
  }
  return (
    <footer className="w-full bg-[#0A0A0D] border-t border-gold/20 text-parchment relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-12 relative z-10">
        <GreekDivider variant="meander" className="mb-12 opacity-40" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-gold/15">
          {/* Brand & Epigraph */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center bg-obsidian-light/80 p-1.5 shadow-[0_0_15px_rgba(198,164,106,0.15)]">
                <Image
                  src={cdn("/images/harpy-logo-light.png")}
                  alt="HARPY AI Logo"
                  width={34}
                  height={34}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-cinzel text-xl tracking-[0.25em] text-parchment font-medium">
                  HARPY AI
                </span>
                <span className="font-inter text-[9px] tracking-widest uppercase text-gold/70">
                  Universal Autonomous Agent
                </span>
              </div>
            </div>

            <p className="font-cormorant italic text-lg text-parchment/70 max-w-lg leading-relaxed">
              &ldquo;And with them the Harpies of lovely hair, Aello and Ocypete, who speed alongside
              the gusts of the winds on swift wings, high in the heavens.&rdquo;
            </p>
            <p className="font-cinzel text-xs tracking-[0.2em] text-gold/60 uppercase">
              — Hesiod, Theogony (c. 700 BCE)
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-gold">
              Navigation
            </h4>
            <ul className="space-y-2.5 font-cormorant text-lg text-parchment/80">
              <li>
                <Link href="/" className="hover:text-gold transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-gold transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-gold transition-colors duration-200">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-gold transition-colors duration-200">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Philosophy / Principles */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-gold">
              The Canon
            </h4>
            <ul className="space-y-2 font-inter text-xs tracking-wider text-parchment/60">
              <li className="flex items-center gap-2">
                <span className="text-gold">I.</span> 1-Click App Connect
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gold">II.</span> Deep In-App Action
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gold">III.</span> Cross-App Harmony
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gold">IV.</span> Verified Transparency
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-inter text-parchment/50">
          <p>© 2026 HARPY AI. Intelligence Beyond Imagination. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="font-cinzel tracking-widest text-[11px] text-gold/70">
              ATHENS · SAN FRANCISCO · LONDON
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

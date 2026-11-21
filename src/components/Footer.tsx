import React from "react";
import Link from "next/link";
import { GreekDivider } from "./GreekDivider";

export function Footer() {
  return (
    <footer className="w-full bg-[#0A0A0D] border-t border-gold/20 text-parchment relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-12 relative z-10">
        <GreekDivider variant="meander" className="mb-12 opacity-40" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-gold/15">
          {/* Brand & Epigraph */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-cinzel text-xl tracking-[0.25em] text-parchment">
                HARPY AI
              </span>
              <span className="text-gold/50 text-xs">◆</span>
              <span className="font-inter text-xs tracking-widest uppercase text-gold/70">
                Autonomous Intelligence
              </span>
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
                <span className="text-gold">I.</span> Unconstrained Reasoning
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gold">II.</span> Autonomous Execution
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gold">III.</span> Classical Precision
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gold">IV.</span> Boundless Reach
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

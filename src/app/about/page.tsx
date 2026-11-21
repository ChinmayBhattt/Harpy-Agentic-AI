"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Feather, Scroll, Compass, Eye } from "lucide-react";
import { GreekDivider } from "@/components/GreekDivider";

export default function AboutPage() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* ──────────────────────────────────────────────────────────
          HERO / MASTHEAD — Classical Editorial Header
         ────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-6 lg:px-12 bg-obsidian text-parchment border-b border-gold/20">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 border border-gold/30 text-gold font-cinzel text-xs tracking-[0.3em] uppercase bg-obsidian-light/60">
              <div className="relative w-4 h-4 flex-shrink-0">
                <Image
                  src="/images/harpy-logo-light.png"
                  alt="Harpy Official Emblem"
                  fill
                  className="object-contain"
                />
              </div>
              <span>TREATISE · VOLUME I</span>
            </div>

            <h1 className="font-cinzel text-4xl sm:text-6xl font-normal tracking-tight text-parchment max-w-4xl mx-auto leading-tight">
              The Genesis of <span className="text-gold italic font-cormorant">HARPY AI</span>
            </h1>

            <p className="font-cormorant italic text-xl sm:text-2xl text-parchment/80 font-light max-w-2xl mx-auto leading-relaxed">
              Where Ancient Greek mythology, Renaissance craftsmanship, and frontier artificial
              intelligence converge.
            </p>
          </motion.div>

          <GreekDivider variant="meander" className="max-w-xl mx-auto my-8 opacity-50" />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 1: THE VISION — Editorial Narrative (Dark)
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-obsidian text-parchment relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Narrative Column */}
          <div className="lg:col-span-7 space-y-6">
            <span className="font-cinzel text-xs tracking-[0.25em] text-gold uppercase">
              Section 01 · The Purpose
            </span>
            <h2 className="font-cinzel text-3xl sm:text-4xl text-parchment leading-snug">
              Beyond Passive Prompts: The Dawn of True Agency
            </h2>
            <div className="w-16 h-0.5 bg-gold/50" />

            <div className="space-y-4 font-inter text-sm sm:text-base text-parchment/75 leading-relaxed font-light">
              <p>
                For decades, computational intelligence has been trapped behind conversational
                dialogue boxes—passive chatbots that speak only when spoken to, incapable of taking
                action inside the actual applications where real work occurs.
              </p>
              <p>
                <strong className="text-gold font-normal">HARPY AI</strong> was conceived to break
                this paradigm. Inspired by the swift winged entities of ancient antiquity who moved
                effortlessly between realms, we built a universal autonomous agent designed to connect
                to your entire software suite—Gmail, Notion, WhatsApp, Instagram, Discord, AI code
                editors, and Google Chrome—through simple, frictionless authentication.
              </p>
              <p>
                Our agent does not merely suggest answers or offer advice. It logs into your digital tools,
                understands your intentions, navigates complex interfaces, and executes your tasks
                directly inside each application—delivering complete, fully autonomous results.
              </p>
            </div>
          </div>

          {/* Classical Artwork Showcase */}
          <div className="lg:col-span-5">
            <div className="border border-gold/35 p-3 bg-obsidian-light shadow-xl relative">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                <Image
                  src="/images/harpy-gold-pendant.jpg"
                  alt="Italian Renaissance Harpy Pendant with Gold and Jewels, The Walters Art Museum"
                  fill
                  className="object-cover filter contrast-[1.1] hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-40" />
              </div>
              <div className="pt-3 px-2 text-center">
                <p className="font-cinzel text-xs text-parchment tracking-widest uppercase">
                  Renaissance Winged Jewel
                </p>
                <p className="font-cormorant italic text-xs text-gold/80">
                  Gold, Enamel &amp; Baroque Pearls · Circa 1580
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 2: MYTHOLOGICAL ROOTS — Parchment Editorial Layout
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 parchment-paper text-obsidian border-y border-bronze/30">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Section Header */}
          <div className="max-w-3xl space-y-4">
            <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-bronze-dark font-bold">
              Section 02 · Mythological Heritage
            </span>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-medium text-obsidian leading-tight">
              The Winged Spirits of the Wind
            </h2>
            <div className="w-16 h-0.5 bg-bronze/60" />
            <p className="font-cormorant italic text-xl text-obsidian/75 leading-relaxed">
              Rescuing the Harpy archetype from misunderstood folklore to its original classical
              majesty.
            </p>
          </div>

          {/* Two-Column Editorial with Classical Artwork */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-6 space-y-6 font-inter text-sm sm:text-base text-obsidian/80 leading-relaxed font-light">
              <p>
                In the earliest Greek poetic tradition—specifically Hesiod&apos;s <em>Theogony</em>—the
                Harpies (from the Greek <em>Harpyiai</em>, meaning &ldquo;snatchers&rdquo; or &ldquo;those
                who swiftly carry away&rdquo;) were the noble daughters of the sea god Thaumas and the
                ocean nymph Electra.
              </p>
              <p>
                They were celebrated as spirits of the sudden tempest, possessing the beautiful faces
                of noble maidens and the magnificent wings of soaring raptors. When the gods decreed
                that something on Earth must be retrieved, protected, or delivered across the
                unreachable expanse of the skies, it was the Harpies who were summoned.
              </p>
              <div className="bg-[#FAF5EC] border-l-2 border-bronze p-6 my-6 font-cormorant italic text-xl text-obsidian">
                &ldquo;They flew as swift as the storm gusts, touching both heaven and earth in a
                single breath—carrying out the unseen will of the cosmos.&rdquo;
              </div>
              <p>
                In modern technology, this ancient archetype embodies the ideal autonomous agent:
                swift, relentless, possessing acute aerial vision, and endowed with the power to
                execute without requiring human micromanagement at every wingbeat.
              </p>
            </div>

            {/* Classical Painting & Sculpture Insets */}
            <div className="lg:col-span-6 space-y-6">
              {/* Harpy Tomb Detail */}
              <div className="border border-bronze/40 p-3 bg-[#FAF5EC] shadow-md space-y-2">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                  <Image
                    src="/images/harpy-tomb-north.jpg"
                    alt="Harpy Tomb North Frieze, British Museum"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="pt-2 text-center">
                  <p className="font-cinzel text-xs text-obsidian tracking-wider font-semibold">
                    THE HARPY CARRYING THE SOUL
                  </p>
                  <p className="font-cormorant italic text-xs text-bronze-dark">
                    North Frieze of the Harpy Tomb · Xanthos, c. 480 BC · British Museum
                  </p>
                </div>
              </div>

              {/* Dual Artwork Mini-Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Waterhouse */}
                <div className="border border-bronze/35 p-2 bg-[#FAF5EC] shadow-sm">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                    <Image
                      src="/images/waterhouse-mythology.jpg"
                      alt="John William Waterhouse - Ulysses and the Sirens"
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="pt-2 text-center">
                    <p className="font-cinzel text-[10px] text-obsidian font-semibold truncate">
                      Waterhouse Mythos
                    </p>
                    <p className="font-cormorant italic text-[11px] text-bronze-dark">1891 Canvas</p>
                  </div>
                </div>

                {/* Andrea del Sarto Detail */}
                <div className="border border-bronze/35 p-2 bg-[#FAF5EC] shadow-sm">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                    <Image
                      src="/images/harpy-del-sarto.jpg"
                      alt="Andrea del Sarto - Pedestal Harpy Detail"
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="pt-2 text-center">
                    <p className="font-cinzel text-[10px] text-obsidian font-semibold truncate">
                      Del Sarto&apos;s Harpy
                    </p>
                    <p className="font-cormorant italic text-[11px] text-bronze-dark">Florence, 1517</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 3: THE FOUR CANONS (Dark Cinematic Section)
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-obsidian text-parchment">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="font-cinzel text-xs tracking-[0.3em] uppercase text-gold">
              Architectural Values
            </span>
            <h2 className="font-cinzel text-3xl sm:text-4xl text-parchment">
              The Four Canons of HARPY AI
            </h2>
            <div className="w-12 h-0.5 bg-gold/50 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gold/25 p-8 bg-obsidian-light/50 space-y-4 hover:border-gold/60 transition-colors duration-300">
              <span className="font-cinzel text-gold text-lg">01 / I</span>
              <h3 className="font-cinzel text-xl text-parchment">Universal App Sovereignty</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                An agent must live where your real work lives. HARPY AI connects with Gmail,
                Notion, WhatsApp, Instagram, Discord, AI code editors, and Chrome through simple
                1-click authentication—dismantling isolated software boundaries.
              </p>
            </div>

            <div className="border border-gold/25 p-8 bg-obsidian-light/50 space-y-4 hover:border-gold/60 transition-colors duration-300">
              <span className="font-cinzel text-gold text-lg">02 / II</span>
              <h3 className="font-cinzel text-xl text-parchment">Deep In-App Action</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                Chat is not the end goal; autonomous execution is. HARPY AI enters directly inside
                your tools to compose emails, update workspaces, coordinate messages, and write code
                without requiring human micro-management.
              </p>
            </div>

            <div className="border border-gold/25 p-8 bg-obsidian-light/50 space-y-4 hover:border-gold/60 transition-colors duration-300">
              <span className="font-cinzel text-gold text-lg">03 / III</span>
              <h3 className="font-cinzel text-xl text-parchment">Autonomous Velocity</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                Speed without direction is chaos; direction without speed is paralysis. True to its
                namesake, HARPY AI acts with aerial speed across APIs, databases, software interfaces,
                and complex multi-application workflows.
              </p>
            </div>

            <div className="border border-gold/25 p-8 bg-obsidian-light/50 space-y-4 hover:border-gold/60 transition-colors duration-300">
              <span className="font-cinzel text-gold text-lg">04 / IV</span>
              <h3 className="font-cinzel text-xl text-parchment">Harmonic Alignment</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                Autonomy requires uncompromising trust. HARPY AI incorporates verifiable chain-of-action
                safeguards, ensuring every step taken inside your software is traceable, auditable,
                and securely aligned with your intent.
              </p>
            </div>
          </div>

          <div className="pt-10 text-center">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-3 px-8 py-3.5 bg-gold text-obsidian font-cinzel text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#E2C99A] transition-all duration-300"
            >
              <span>Witness How It Works</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 4: SANCTUARIES OF REASON & CLASSICAL ARCHITECTURE
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 parchment-paper text-obsidian border-t border-bronze/30">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="font-cinzel text-xs tracking-[0.3em] uppercase text-bronze-dark font-bold">
              Architectural Sanctuaries
            </span>
            <h2 className="font-cinzel text-3xl sm:text-4xl text-obsidian font-medium">
              Cradles of Dialectic &amp; Geometry
            </h2>
            <div className="w-16 h-0.5 bg-bronze/60 mx-auto" />
            <p className="font-cormorant italic text-xl text-obsidian/75 leading-relaxed">
              The physical geometry that inspires our cognitive architecture: permanence, mathematical rigor, and timeless grace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Sanctuary 1: Tholos of Delphi */}
            <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-3 shadow-sm space-y-3 group hover:border-bronze-dark transition-colors duration-300">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <Image
                  src="/images/delphi-tholos.jpg"
                  alt="Tholos of Athena Pronaia at Delphi"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-2 space-y-1">
                <span className="font-cinzel text-[10px] text-bronze-dark uppercase tracking-widest block">
                  Delphi Sanctuary · 380 BC
                </span>
                <h4 className="font-cinzel text-base text-obsidian font-semibold">
                  The Tholos of Athena Pronaia
                </h4>
                <p className="font-inter text-xs text-obsidian/70 font-light leading-relaxed">
                  The quintessential Greek circular temple where sacred geometry unified mathematics and cosmological contemplation.
                </p>
              </div>
            </div>

            {/* Sanctuary 2: Cape Sounion */}
            <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-3 shadow-sm space-y-3 group hover:border-bronze-dark transition-colors duration-300">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <Image
                  src="/images/sounion-temple.jpg"
                  alt="Temple of Poseidon at Cape Sounion"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-2 space-y-1">
                <span className="font-cinzel text-[10px] text-bronze-dark uppercase tracking-widest block">
                  Cape Sounion · 444 BC
                </span>
                <h4 className="font-cinzel text-base text-obsidian font-semibold">
                  Temple of Poseidon
                </h4>
                <p className="font-inter text-xs text-obsidian/70 font-light leading-relaxed">
                  Standing guard above the Aegean Sea, charting clear flight lines and guiding voyagers across boundless waters.
                </p>
              </div>
            </div>

            {/* Sanctuary 3: The Parthenon */}
            <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-3 shadow-sm space-y-3 group hover:border-bronze-dark transition-colors duration-300">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <Image
                  src="/images/parthenon.jpg"
                  alt="The Parthenon, Acropolis of Athens"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-2 space-y-1">
                <span className="font-cinzel text-[10px] text-bronze-dark uppercase tracking-widest block">
                  Athenian Acropolis · 447 BC
                </span>
                <h4 className="font-cinzel text-base text-obsidian font-semibold">
                  The Parthenon
                </h4>
                <p className="font-inter text-xs text-obsidian/70 font-light leading-relaxed">
                  The pinnacle of classical Doric order, whose subtle optical entasis proves that supreme intelligence values harmony over rigid mechanization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

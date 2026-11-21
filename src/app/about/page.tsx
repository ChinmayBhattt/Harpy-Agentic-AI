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
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-gold/30 text-gold font-cinzel text-xs tracking-[0.3em] uppercase">
              TREATISE · VOLUME I
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
                dialogue boxes—passive tools that speak only when spoken to, incapable of taking
                flight across the vast digital landscapes where real work occurs.
              </p>
              <p>
                <strong className="text-gold font-normal">HARPY AI</strong> was conceived to break
                this paradigm. Inspired by the swift winged entities of ancient antiquity, we built
                an autonomous agent architecture capable of transforming human intent into complete,
                flawlessly realized outcomes.
              </p>
              <p>
                Our agents do not merely suggest next steps. They perceive the horizon, formulate
                comprehensive strategies, interface with complex external systems, and carry out
                intricate multi-step journeys while preserving total human alignment.
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

            {/* Classical Painting Inset */}
            <div className="lg:col-span-6 space-y-4">
              <div className="border border-bronze/40 p-2 bg-[#FAF5EC] shadow-md">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                  <Image
                    src="/images/waterhouse-mythology.jpg"
                    alt="John William Waterhouse - Ulysses and the Sirens (1891)"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="pt-3 pb-1 px-2 text-center">
                  <p className="font-cinzel text-xs text-obsidian tracking-wider font-semibold">
                    ULYSSES AND THE WINGED SPIRITS
                  </p>
                  <p className="font-cormorant italic text-xs text-bronze-dark">
                    John William Waterhouse · 1891 · National Gallery of Victoria
                  </p>
                </div>
              </div>

              {/* Temple Architectural Detail */}
              <div className="border border-bronze/30 p-4 bg-[#FAF5EC] flex items-center gap-4">
                <div className="w-16 h-16 relative flex-shrink-0 border border-bronze/40 overflow-hidden">
                  <Image
                    src="/images/delphi-temple.jpg"
                    alt="Tholos of Delphi Temple"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-cinzel text-xs text-obsidian font-semibold tracking-wider">
                    THE SANCTUARY OF DELPHI
                  </h4>
                  <p className="font-inter text-xs text-obsidian/70 leading-normal">
                    Where ancient oracles prophesied outcomes that winged messengers brought into
                    reality.
                  </p>
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
              <h3 className="font-cinzel text-xl text-parchment">Unbounded Reasoning</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                We design our models to reason without preconceived shortcuts. Before taking action,
                HARPY AI evaluates probabilistic futures, models counterfactuals, and ensures every
                decision aligns with the overarching human objective.
              </p>
            </div>

            <div className="border border-gold/25 p-8 bg-obsidian-light/50 space-y-4 hover:border-gold/60 transition-colors duration-300">
              <span className="font-cinzel text-gold text-lg">02 / II</span>
              <h3 className="font-cinzel text-xl text-parchment">Autonomous Velocity</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                Speed without direction is chaos; direction without speed is paralysis. True to its
                namesake, HARPY AI acts with aerial speed across APIs, databases, software systems,
                and analytical tasks.
              </p>
            </div>

            <div className="border border-gold/25 p-8 bg-obsidian-light/50 space-y-4 hover:border-gold/60 transition-colors duration-300">
              <span className="font-cinzel text-gold text-lg">03 / III</span>
              <h3 className="font-cinzel text-xl text-parchment">Harmonic Alignment</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                Autonomy requires trust. HARPY AI incorporates verifiable chain-of-deliberation
                safeguards, ensuring every winged step is traceable, inspectable, and safely bounded
                by human intent.
              </p>
            </div>

            <div className="border border-gold/25 p-8 bg-obsidian-light/50 space-y-4 hover:border-gold/60 transition-colors duration-300">
              <span className="font-cinzel text-gold text-lg">04 / IV</span>
              <h3 className="font-cinzel text-xl text-parchment">Classical Aesthetics</h3>
              <p className="font-inter text-sm text-parchment/70 leading-relaxed font-light">
                We believe that the tools of the mind should possess dignity, clarity, and beauty.
                Technology should not feel cold and disposable; it should evoke the enduring grace
                of classical sculpture and mathematical harmony.
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
    </div>
  );
}

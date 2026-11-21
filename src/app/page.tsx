"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Compass, Shield, Feather, Sparkles } from "lucide-react";
import { GreekDivider } from "@/components/GreekDivider";

export default function HomePage() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* ──────────────────────────────────────────────────────────
          HERO SECTION — Dark Obsidian with Weathered Gold & Parchment
         ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-8 pb-20 px-6 lg:px-12 bg-obsidian">
        {/* Soft atmospheric gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(198,164,106,0.12),transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-20">
          {/* Hero Editorial Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-8 text-left"
          >
            {/* Classical Eyebrow Badge */}
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 border border-gold/30 rounded-none bg-obsidian-light/60 backdrop-blur-sm">
              <span className="font-cinzel text-[11px] tracking-[0.28em] uppercase text-gold">
                Universal Autonomous Agent · All Applications Connected
              </span>
            </div>

            {/* Main Editorial Hero Heading */}
            <h1 className="font-cinzel text-4xl sm:text-6xl xl:text-7xl font-normal tracking-[0.03em] leading-[1.08] text-parchment">
              One Agent. <br />
              <span className="italic font-cormorant font-light text-gold text-5xl sm:text-7xl xl:text-8xl">
                Every
              </span>{" "}
              Application.
            </h1>

            {/* Subtitle */}
            <p className="font-cormorant italic text-xl sm:text-2xl text-parchment/80 font-light max-w-xl leading-relaxed">
              &ldquo;Authenticate your tools. State any goal. Watch Harpy execute inside your apps with total autonomy.&rdquo;
            </p>

            {/* Short Introduction to Autonomous AI Concept */}
            <p className="font-inter text-sm sm:text-base text-parchment/65 leading-relaxed max-w-xl font-light">
              Named after the legendary swift-winged spirits of ancient Greek myth, HARPY AI connects
              seamlessly to all your essential applications—Gmail, Notion, WhatsApp, Instagram,
              Discord, AI code editors, and Chrome—through simple authentication. Give it any task,
              and Harpy enters your tools to execute it completely automatically from start to finish.
            </p>

            {/* Dual Classical CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-5">
              <Link
                href="/dashbord"
                className="group px-7 py-3.5 bg-gold text-obsidian font-cinzel text-xs tracking-[0.2em] uppercase font-semibold transition-all duration-300 hover:bg-[#E2C99A] hover:shadow-[0_0_25px_rgba(198,164,106,0.3)] flex items-center gap-3"
              >
                <span>Discover the System</span>
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <Link
                href="/about"
                className="px-7 py-3.5 border border-gold/40 text-parchment font-cinzel text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-gold hover:text-gold hover:bg-gold/5"
              >
                The Mythology &amp; Vision
              </Link>
            </div>

            {/* Subtle Metadata bar */}
            <div className="pt-6 border-t border-gold/15 flex items-center gap-8 text-xs font-inter text-parchment/45">
              <div>
                <span className="font-cinzel text-gold text-xs block">01 / AUTHENTICATE</span>
                <span>1-Click App Connect</span>
              </div>
              <div className="h-6 w-px bg-gold/15" />
              <div>
                <span className="font-cinzel text-gold text-xs block">02 / COMMAND</span>
                <span>Plain Language Goal</span>
              </div>
              <div className="h-6 w-px bg-gold/15" />
              <div>
                <span className="font-cinzel text-gold text-xs block">03 / EXECUTE</span>
                <span>Fully Autonomous Action</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Harpy Artwork Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            {/* Classical Ornamental Picture Frame */}
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer Golden Halo Glow */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-burgundy/30 via-gold/15 to-transparent blur-2xl rounded-full pointer-events-none" />

              {/* Master Artwork Card */}
              <div className="relative bg-obsidian-light border border-gold/40 p-4 sm:p-5 shadow-2xl">
                {/* Greek Key Inner Border Accent */}
                <div className="relative border border-gold/25 p-1 bg-obsidian overflow-hidden">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#181512]">
                    <Image
                      src="/images/harpy-renaissance.jpg"
                      alt="Classical Renaissance engraving of a Greek Mythological Harpy by Melchior Lorch (1582)"
                      fill
                      priority
                      className="object-cover object-top filter contrast-[1.08] sepia-[0.25] transition-transform duration-700 hover:scale-105"
                    />

                    {/* Subtle Antique Parchment & Gold Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-60" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-gold/20" />
                  </div>

                  {/* Artwork Plaque / Caption */}
                  <div className="pt-3 pb-2 px-3 bg-obsidian-light/90 border-t border-gold/20 flex items-center justify-between">
                    <div>
                      <p className="font-cinzel text-[11px] tracking-widest text-parchment font-semibold">
                        THE HARPY OF LORCH
                      </p>
                      <p className="font-cormorant italic text-xs text-gold/80">
                        Copperplate Engraving, 1582
                      </p>
                    </div>
                    <span className="font-cinzel text-xs text-gold/60 border border-gold/30 px-2 py-0.5">
                      PLATE I
                    </span>
                  </div>
                </div>

                {/* Corner Renaissance Accents */}
                <span className="absolute -top-1 -left-1 text-gold text-xs leading-none">⌜</span>
                <span className="absolute -top-1 -right-1 text-gold text-xs leading-none">⌝</span>
                <span className="absolute -bottom-1 -left-1 text-gold text-xs leading-none">⌞</span>
                <span className="absolute -bottom-1 -right-1 text-gold text-xs leading-none">⌟</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 2: WARM ANTIQUE PARCHMENT SECTION — Autonomous AI Concept
         ────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 lg:px-12 parchment-paper text-obsidian border-y border-bronze/30">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
            <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-bronze-dark font-bold">
              Universal Connected Autonomy
            </span>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-medium tracking-tight text-obsidian">
              One Agent Inside All Your Tools
            </h2>
            <div className="w-16 h-0.5 bg-bronze/60 mx-auto my-3" />
            <p className="font-cormorant italic text-xl text-obsidian/75 leading-relaxed">
              Traditional AI is trapped in a chat box. HARPY AI authenticates into your apps and completes tasks directly inside them.
            </p>
          </div>

          {/* Three Classical Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Column 1 */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FAF5EC] border border-[#D5C2A5] p-8 space-y-5 relative shadow-sm"
            >
              <div className="w-12 h-12 border border-bronze/40 flex items-center justify-center bg-parchment-100 text-bronze-dark">
                <Compass className="w-6 h-6 stroke-[1.4]" />
              </div>
              <span className="font-cinzel text-xs text-bronze-dark tracking-[0.2em] block">
                CAPABILITY 01
              </span>
              <h3 className="font-cinzel text-2xl font-semibold text-obsidian">
                1-Click App Connect
              </h3>
              <p className="font-inter text-sm text-obsidian/75 leading-relaxed font-light">
                Connect your entire digital suite—Gmail, Notion, WhatsApp, Instagram, Discord,
                AI code editors, and Chrome—simply through secure authentication. No manual scripts,
                complex configurations, or custom API keys required.
              </p>
            </motion.div>

            {/* Column 2 */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FAF5EC] border border-[#D5C2A5] p-8 space-y-5 relative shadow-sm"
            >
              <div className="w-12 h-12 border border-bronze/40 flex items-center justify-center bg-parchment-100 text-bronze-dark">
                <Feather className="w-6 h-6 stroke-[1.4]" />
              </div>
              <span className="font-cinzel text-xs text-bronze-dark tracking-[0.2em] block">
                CAPABILITY 02
              </span>
              <h3 className="font-cinzel text-2xl font-semibold text-obsidian">
                Deep In-App Action
              </h3>
              <p className="font-inter text-sm text-obsidian/75 leading-relaxed font-light">
                HARPY AI does not merely generate text; it acts inside your applications. It reads
                and sends emails in Gmail, manages pages in Notion, messages on WhatsApp, navigates
                the web in Chrome, and modifies code in your editor automatically.
              </p>
            </motion.div>

            {/* Column 3 */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FAF5EC] border border-[#D5C2A5] p-8 space-y-5 relative shadow-sm"
            >
              <div className="w-12 h-12 border border-bronze/40 flex items-center justify-center bg-parchment-100 text-bronze-dark">
                <Shield className="w-6 h-6 stroke-[1.4]" />
              </div>
              <span className="font-cinzel text-xs text-bronze-dark tracking-[0.2em] block">
                CAPABILITY 03
              </span>
              <h3 className="font-cinzel text-2xl font-semibold text-obsidian">
                Cross-App Workflows
              </h3>
              <p className="font-inter text-sm text-obsidian/75 leading-relaxed font-light">
                Stitch complex multi-application goals into a single autonomous flight. An incoming
                message on WhatsApp triggers an update in Notion, an action in your AI code editor, and
                a confirmation dispatch over Gmail—fully automated.
              </p>
            </motion.div>
          </div>

          {/* Editorial Pullquote on Parchment */}
          <div className="mt-20 border-t border-b border-bronze/30 py-12 px-6 text-center max-w-4xl mx-auto">
            <p className="font-cormorant italic text-2xl sm:text-3xl text-obsidian leading-snug">
              &ldquo;You should not have to manually copy-paste between fragmented tools. You authenticate once;
              HARPY AI takes flight to accomplish the task across all your software.&rdquo;
            </p>
            <p className="font-cinzel text-xs tracking-[0.25em] text-bronze-dark uppercase mt-4">
              — The HARPY AI Architectural Manifesto
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 3: CINEMATIC DARK SECTION — Classical Mythology & Renaissance Engravings
         ────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 lg:px-12 bg-obsidian text-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Engraving Artwork Dual Plates */}
            <div className="lg:col-span-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gold/30 p-2.5 bg-obsidian-light">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                    <Image
                      src="/images/harpy-dore.jpg"
                      alt="Gustave Doré classical engraving of Harpies in Dante's Inferno"
                      fill
                      className="object-cover filter contrast-[1.15] brightness-90 hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-50" />
                  </div>
                  <div className="pt-2.5 px-1 text-center">
                    <span className="font-cinzel text-gold text-[10px] tracking-wider block">
                      PLATE I · CANTO XIII
                    </span>
                    <span className="italic font-cormorant text-xs text-parchment/60">Gustave Doré · The Harpies</span>
                  </div>
                </div>

                <div className="border border-gold/30 p-2.5 bg-obsidian-light">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                    <Image
                      src="/images/harpy-dore-inferno.jpg"
                      alt="Gustave Doré wood engraving of the Wood of Suicides in Dante's Inferno"
                      fill
                      className="object-cover filter contrast-[1.15] brightness-90 hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-50" />
                  </div>
                  <div className="pt-2.5 px-1 text-center">
                    <span className="font-cinzel text-gold text-[10px] tracking-wider block">
                      PLATE II · CANTO XIII
                    </span>
                    <span className="italic font-cormorant text-xs text-parchment/60">The Wood of the Suicides</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Classical Narrative */}
            <div className="lg:col-span-6 space-y-6">
              <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-gold">
                Mythological Archetype
              </span>
              <h2 className="font-cinzel text-3xl sm:text-4xl text-parchment leading-tight">
                Swift Messengers Across Every Digital Sanctuary
              </h2>
              <div className="w-12 h-0.5 bg-gold/50" />
              <p className="font-cormorant italic text-lg sm:text-xl text-parchment/80 leading-relaxed font-light">
                In ancient Greek myth, the Harpies were celebrated as the swift spirits of the wind—beings
                entrusted by the gods to travel effortlessly between heaven and earth, executing divine
                decrees without hesitation or fatigue.
              </p>
              <p className="font-inter text-sm text-parchment/65 leading-relaxed font-light">
                Today, our work is scattered across fragmented tools: Gmail, Notion, WhatsApp, Instagram,
                Discord, AI code editors, and browsers. HARPY AI unites these digital islands. By
                authenticating seamlessly into each application, our agent takes flight inside your software,
                carrying out multi-step workflows and completing your tasks automatically.
              </p>

              <div className="pt-4">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 font-cinzel text-xs uppercase tracking-[0.2em] text-gold hover:text-[#E2C99A] border-b border-gold/40 pb-1 transition-colors duration-200"
                >
                  <span>Explore the Mythological Vision</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 4: CLASSICAL ARTIFACTS & MYTHOLOGICAL ARCHETYPES
         ────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 lg:px-12 parchment-paper text-obsidian border-t border-bronze/30">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-bronze-dark font-bold">
              The Classical Treasury
            </span>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-medium tracking-tight text-obsidian">
              Artifacts of the Winged Mythos
            </h2>
            <div className="w-16 h-0.5 bg-bronze/60 mx-auto my-3" />
            <p className="font-cormorant italic text-xl text-obsidian/75 leading-relaxed">
              Explore the timeless sculptures, friezes, and engravings that inform the philosophical design of HARPY AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Artifact 1: Harpy Tomb Relief */}
            <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-3 shadow-md space-y-3 group hover:border-bronze-dark transition-all duration-300">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <Image
                  src="/images/harpy-tomb-relief.jpg"
                  alt="Lycian Harpy Tomb Reliefs, Xanthos, British Museum"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-2 space-y-1">
                <span className="font-cinzel text-[10px] text-bronze-dark tracking-widest block uppercase">
                  c. 480 BC · British Museum
                </span>
                <h4 className="font-cinzel text-base text-obsidian font-semibold">
                  The Harpy Tomb of Xanthos
                </h4>
                <p className="font-inter text-xs text-obsidian/70 font-light leading-relaxed">
                  Monumental Lycian marble friezes depicting winged spirits carrying souls with divine gentleness.
                </p>
              </div>
            </div>

            {/* Artifact 2: Greek Kylix Vase */}
            <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-3 shadow-md space-y-3 group hover:border-bronze-dark transition-all duration-300">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <Image
                  src="/images/harpy-greek-vase.jpg"
                  alt="Attic Red-Figure Cup with Phineus and Harpies, Musée du Louvre"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-2 space-y-1">
                <span className="font-cinzel text-[10px] text-bronze-dark tracking-widest block uppercase">
                  Classical Attic · Louvre
                </span>
                <h4 className="font-cinzel text-base text-obsidian font-semibold">
                  Attic Red-Figure Cup
                </h4>
                <p className="font-inter text-xs text-obsidian/70 font-light leading-relaxed">
                  Ancient Greek ceramic depicting the Boreads pursuing swift Harpies across the heavens.
                </p>
              </div>
            </div>

            {/* Artifact 3: Nike of Samothrace */}
            <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-3 shadow-md space-y-3 group hover:border-bronze-dark transition-all duration-300">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <Image
                  src="/images/nike-samothrace.jpg"
                  alt="Winged Victory of Samothrace, Musée du Louvre"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-2 space-y-1">
                <span className="font-cinzel text-[10px] text-bronze-dark tracking-widest block uppercase">
                  Hellenistic Marble · Louvre
                </span>
                <h4 className="font-cinzel text-base text-obsidian font-semibold">
                  Winged Victory of Samothrace
                </h4>
                <p className="font-inter text-xs text-obsidian/70 font-light leading-relaxed">
                  The crowning achievement of Greek Hellenistic sculpture, embodying soaring triumph and poise.
                </p>
              </div>
            </div>

            {/* Artifact 4: Aldrovandi Woodcut */}
            <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-3 shadow-md space-y-3 group hover:border-bronze-dark transition-all duration-300">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <Image
                  src="/images/harpy-aldrovandi.jpg"
                  alt="Ulisse Aldrovandi Harpy woodcut engraving (1642)"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-2 space-y-1">
                <span className="font-cinzel text-[10px] text-bronze-dark tracking-widest block uppercase">
                  Bologna, 1642 · Monstrorum
                </span>
                <h4 className="font-cinzel text-base text-obsidian font-semibold">
                  Aldrovandi&apos;s Engraving
                </h4>
                <p className="font-inter text-xs text-obsidian/70 font-light leading-relaxed">
                  Early modern natural philosopher Ulisse Aldrovandi&apos;s classical cataloging of winged folklore.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 4: ELEGANT EDITORIAL CTA
         ────────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 lg:px-12 bg-gradient-to-b from-obsidian to-[#0A0A0E] text-center border-t border-gold/20">
        <div className="max-w-4xl mx-auto space-y-8">
          <GreekDivider variant="simple" className="max-w-md mx-auto" />

          <span className="font-cinzel text-xs tracking-[0.3em] uppercase text-gold">
            Universal App Autonomy
          </span>

          <h2 className="font-cinzel text-3xl sm:text-5xl text-parchment font-normal tracking-wide">
            One Agent. Every Connected Application.
          </h2>

          <p className="font-cormorant italic text-xl text-parchment/75 max-w-xl mx-auto leading-relaxed">
            Authenticate Gmail, Notion, WhatsApp, Discord, AI code editors, and Chrome.
            Experience fully autonomous task execution today.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-5">
            <Link
              href="/contact"
              className="px-8 py-4 bg-gold text-obsidian font-cinzel text-xs tracking-[0.22em] uppercase font-semibold hover:bg-[#E2C99A] transition-all duration-300 hover:shadow-[0_0_30px_rgba(198,164,106,0.3)]"
            >
              Initiate Consultation
            </Link>
            <Link
              href="/how-it-works"
              className="px-8 py-4 border border-gold/40 text-parchment font-cinzel text-xs tracking-[0.22em] uppercase hover:border-gold hover:text-gold transition-all duration-300"
            >
              Examine the Workflow
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

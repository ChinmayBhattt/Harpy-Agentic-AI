"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MessageSquare,
  GitBranch,
  Zap,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { GreekDivider } from "@/components/GreekDivider";

const steps = [
  {
    roman: "I",
    phase: "STEP 01",
    title: "Authenticate Your Apps",
    subtitle: "1-Click connection to Gmail, Notion, WhatsApp, Discord, Code Editors & Chrome.",
    icon: MessageSquare,
    image: "/images/delphi-tholos.jpg",
    imageAlt: "Tholos of Athena Pronaia at the Sanctuary of Delphi",
    imageCaption: "Sanctuary of Delphi · Connecting fragmented tools into one unified gateway",
    description:
      "Connect your complete software ecosystem in seconds. Through secure 1-click authentication, HARPY AI seamlessly interfaces with your daily tools—Gmail, Notion, WhatsApp, Instagram, Discord, AI code editors, and Google Chrome. No manual scripts, fragile APIs, or technical overhead required.",
    quote: "“A single authentication key opens the gateway to your entire digital realm.”",
  },
  {
    roman: "II",
    phase: "STEP 02",
    title: "State Any Goal",
    subtitle: "Articulate your objective in natural, everyday human language.",
    icon: GitBranch,
    image: "/images/sounion-temple.jpg",
    imageAlt: "Temple of Poseidon at Cape Sounion at sunset",
    imageCaption: "Cape Sounion · Charting sovereign paths across uncharted waters",
    description:
      "Speak without syntactic constraints or micro-instructions: 'Review unread Gmail threads from client X, create task tickets in Notion, alert our engineering channel on WhatsApp and Discord, and prepare the fix in our AI code editor.' HARPY AI immediately deconstructs your intent into a multi-app flight path.",
    quote: "“The voice speaks the intention; the agent charts the multi-app horizon.”",
  },
  {
    roman: "III",
    phase: "STEP 03",
    title: "Autonomous In-App Action",
    subtitle: "The agent enters your tools and completes tasks directly inside them.",
    icon: Zap,
    image: "/images/harpy-greek-vase.jpg",
    imageAlt: "Attic red-figure vase depicting the winged Boreads and Harpies in flight",
    imageCaption: "Attic Kylix (Louvre) · Swift winged agents executing inside your software",
    description:
      "With the plan established, HARPY AI takes flight inside your software. It reads, composes, and dispatches in Gmail, manages databases in Notion, sends messages on WhatsApp and Discord, navigates the web in Chrome, and commits code in your AI editor—operating fully autonomously from start to finish.",
    quote: "“Swift as the gale, the agent moves between applications with sovereign autonomy.”",
  },
  {
    roman: "IV",
    phase: "STEP 04",
    title: "Task Completed & Verified",
    subtitle: "Rigorously confirmed outcomes across all connected applications.",
    icon: CheckCircle2,
    image: "/images/nike-samothrace.jpg",
    imageAlt: "The Winged Victory of Samothrace, Louvre Museum",
    imageCaption: "Nike of Samothrace (Louvre) · The crowning verified triumph",
    description:
      "The mission reaches completion. Every email sent, Notion document updated, WhatsApp message delivered, and code file modified during the flight is cross-checked against your original instruction. You receive pristine deliverables alongside a transparent, auditable cognitive log.",
    quote: "“The mission is accomplished across all your tools, flawless and beyond expectation.”",
  },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="relative w-full overflow-hidden">
      {/* ──────────────────────────────────────────────────────────
          HERO / MASTHEAD — Editorial Header
         ────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-20 px-6 lg:px-12 bg-obsidian text-parchment border-b border-gold/20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-gold/30 text-gold font-cinzel text-xs tracking-[0.3em] uppercase">
              OPERATIONAL BLUEPRINT · MMXXVI
            </div>

            <h1 className="font-cinzel text-4xl sm:text-6xl font-normal tracking-tight text-parchment">
              How <span className="text-gold italic font-cormorant">HARPY AI</span> Operates
            </h1>

            <p className="font-cormorant italic text-xl sm:text-2xl text-parchment/80 font-light max-w-2xl mx-auto leading-relaxed">
              Authenticate your apps, articulate your goal, watch autonomous cross-app execution, and receive verified results.
            </p>
          </motion.div>

          <GreekDivider variant="meander" className="max-w-xl mx-auto my-8 opacity-40" />

          {/* Core Formula Banner */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 p-4 border border-gold/30 bg-obsidian-light/80 text-xs sm:text-sm font-cinzel text-parchment">
            <span className="text-gold font-medium">Authenticate Apps</span>
            <span className="text-gold/50">→</span>
            <span className="text-gold font-medium">State Any Goal</span>
            <span className="text-gold/50">→</span>
            <span className="text-gold font-medium">Autonomous In-App Action</span>
            <span className="text-gold/50">→</span>
            <span className="text-gold font-semibold underline decoration-gold/60 underline-offset-4">
              Task Completed
            </span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 1: THE 4-STAGE LINEAR JOURNEY (Dark Cinematic)
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-obsidian text-parchment relative">
        <div className="max-w-5xl mx-auto space-y-20">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isEven = idx % 2 === 1;

            return (
              <motion.div
                key={step.phase}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${
                  isEven ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Visual Plaque / Monolith Card */}
                <div className={`lg:col-span-5 ${isEven ? "lg:order-2" : "lg:order-1"}`}>
                  <div className="border border-gold/35 bg-obsidian-light/70 p-5 relative overflow-hidden group hover:border-gold transition-colors duration-300">
                    {/* Classical Artwork Inset */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden border border-gold/25 bg-black mb-5">
                      <Image
                        src={step.image}
                        alt={step.imageAlt}
                        fill
                        className="object-cover filter contrast-[1.05] brightness-95 group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-60" />
                      <div className="absolute bottom-2 left-2 right-2 text-center">
                        <p className="font-cormorant italic text-[11px] text-parchment/85 drop-shadow">
                          {step.imageCaption}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 border border-gold/40 flex items-center justify-center bg-obsidian text-gold">
                          <Icon className="w-5 h-5 stroke-[1.5]" />
                        </div>
                        <span className="font-cinzel text-xs text-gold/70 border border-gold/25 px-2.5 py-0.5">
                          PHASE {step.roman}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-cinzel text-xs text-gold tracking-[0.25em]">
                          {step.phase}
                        </span>
                        <span className="h-px w-8 bg-gold/30" />
                        <span className="font-cormorant italic text-sm text-parchment/60">
                          {step.title}
                        </span>
                      </div>

                      <p className="font-cormorant italic text-base text-gold/80 leading-snug">
                        {step.quote}
                      </p>
                    </div>

                    {/* Corner Accents */}
                    <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/60" />
                    <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/60" />
                    <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/60" />
                    <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/60" />
                  </div>
                </div>

                {/* Editorial Detailed Explanation */}
                <div className={`lg:col-span-7 space-y-4 ${isEven ? "lg:order-1" : "lg:order-2"}`}>
                  <span className="font-inter text-xs uppercase tracking-[0.25em] text-gold/70 block">
                    {step.subtitle}
                  </span>
                  <h4 className="font-cinzel text-xl sm:text-2xl text-parchment">
                    From Human Intent to Structured Reality
                  </h4>
                  <div className="w-12 h-0.5 bg-gold/40" />
                  <p className="font-inter text-sm sm:text-base text-parchment/75 leading-relaxed font-light">
                    {step.description}
                  </p>

                  <div className="pt-2 flex items-center gap-4 text-xs font-inter text-parchment/50">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/80" />
                      Zero Latency Overhead
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/80" />
                      Deterministic Verification
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 2: WARM PARCHMENT WALKTHROUGH — A Concrete Example
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 parchment-paper text-obsidian border-y border-bronze/30">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-bronze-dark font-bold">
              Autonomous Flight in Practice
            </span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-medium text-obsidian">
              Anatomy of an Autonomous Mission
            </h2>
            <div className="w-16 h-0.5 bg-bronze/60 mx-auto" />
            <p className="font-cormorant italic text-lg text-obsidian/75">
              Witness how a single objective transforms into completed reality.
            </p>
          </div>

          {/* Interactive Simulation / Step Showcase */}
          <div className="bg-[#FAF5EC] border border-[#D5C2A5] p-6 sm:p-10 shadow-lg space-y-8">
            {/* Step Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-bronze/20 pb-4">
              {steps.map((st, i) => (
                <button
                  key={st.roman}
                  onClick={() => setActiveStep(i)}
                  className={`text-left p-3 border transition-all duration-200 ${
                    activeStep === i
                      ? "border-bronze bg-[#EFE6D5] text-obsidian font-semibold"
                      : "border-transparent text-obsidian/60 hover:text-obsidian hover:bg-[#F2ECE1]"
                  }`}
                >
                  <span className="font-cinzel text-xs text-bronze-dark block">{st.phase}</span>
                  <span className="font-cormorant text-sm truncate block">{st.title}</span>
                </button>
              ))}
            </div>

            {/* Active Step Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="font-cinzel text-xs text-bronze-dark tracking-widest uppercase">
                  Current Stage: {steps[activeStep].phase} · {steps[activeStep].title}
                </span>
                <h3 className="font-cinzel text-2xl text-obsidian font-medium">
                  {steps[activeStep].subtitle}
                </h3>
                <p className="font-inter text-sm text-obsidian/80 leading-relaxed font-light">
                  {steps[activeStep].description}
                </p>

                <div className="pt-2 font-cormorant italic text-lg text-bronze-dark">
                  {steps[activeStep].quote}
                </div>
              </div>

              {/* Classical Visual & System Log Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="relative aspect-[16/9] w-full overflow-hidden border border-gold/40 bg-obsidian shadow-md">
                  <Image
                    src={steps[activeStep].image}
                    alt={steps[activeStep].imageAlt}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-3 font-cormorant italic text-xs text-parchment/90 drop-shadow">
                    {steps[activeStep].imageCaption}
                  </span>
                </div>

                <div className="bg-obsidian text-parchment p-5 border border-gold/30 font-mono text-xs space-y-2 rounded-none shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-gold/20 text-[10px] text-gold/70">
                    <span>harpy-agent-kernel · v2.6.4</span>
                    <span className="text-emerald-400">● 7 APPS CONNECTED</span>
                  </div>
                  <div className="space-y-1 text-parchment/80 pt-1">
                    <p className="text-gold/90">&gt; intent: &quot;Process client request across all tools&quot;</p>
                    <p className="text-parchment/60">&gt; [Gmail] parsed urgent feedback thread from Enterprise partner</p>
                    <p className="text-parchment/60">&gt; [Notion] created sprint ticket #842 with reproduction notes</p>
                    <p className="text-parchment/60">&gt; [AI Editor] patched auth_handler.ts &amp; verified unit tests (14/14 PASS)</p>
                    <p className="text-parchment/60">&gt; [WhatsApp] sent status report to engineering group</p>
                    <p className="text-parchment/60">&gt; [Discord] posted deployment alert in #announcements</p>
                    <p className="text-emerald-400">&gt; cross-app mission completed autonomously in 3.14s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 3: CLOSING CALL TO ACTION
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-obsidian text-center border-t border-gold/20">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="font-cinzel text-3xl sm:text-4xl text-parchment">
            Ready to Connect Your Applications?
          </h2>
          <p className="font-cormorant italic text-xl text-parchment/75">
            Authenticate your apps. State your goal. Let HARPY AI execute the rest.
          </p>
          <div className="pt-4">
            <Link
              href="/started"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gold text-obsidian font-cinzel text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#E2C99A] transition-all duration-300"
            >
              <span>Connect Your Ecosystem</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

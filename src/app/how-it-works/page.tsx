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
    title: "Describe Your Goal",
    subtitle: "Articulate your raw intent in natural human language.",
    icon: MessageSquare,
    description:
      "Speak without syntactic constraints or micro-instructions. Whether it is conducting comprehensive competitive intelligence, orchestrating a multi-service technical migration, or synthesizing an academic treatise, state your desired end-state. HARPY AI immediately extracts semantic objectives, boundary conditions, and unspoken context.",
    quote: "“The voice speaks the intention; the intellect grasps the infinite horizon.”",
  },
  {
    roman: "II",
    phase: "STEP 02",
    title: "AI Plans",
    subtitle: "Sophisticated deliberation and trajectory graph synthesis.",
    icon: GitBranch,
    description:
      "HARPY AI does not blindly act. The cognitive engine constructs a multi-branched deliberation tree, modeling contingencies, evaluating tool pathways, and establishing checkpoints. It drafts a precise flight path—a verifiable execution graph that balances velocity with total mathematical precision.",
    quote: "“Before the wings unfold, the currents of the winds are already charted.”",
  },
  {
    roman: "III",
    phase: "STEP 03",
    title: "AI Executes",
    subtitle: "Autonomous winged action across digital environments.",
    icon: Zap,
    description:
      "With the plan established, the agent takes flight. HARPY AI independently interfaces with APIs, traverses cloud infrastructure, runs computations, parses literature, and handles unexpected obstacles in real-time without requiring human hand-holding or micro-management.",
    quote: "“Swift as the gale, the agent moves between systems with sovereign autonomy.”",
  },
  {
    roman: "IV",
    phase: "STEP 04",
    title: "Task Completed",
    subtitle: "Rigorously verified outcomes with complete auditable provenance.",
    icon: CheckCircle2,
    description:
      "The mission reaches completion. Every artifact, metric, and analytical insight produced during the flight is cross-validated against your original intent. You receive pristine deliverables alongside an auditable cognitive log detailing every decision made along the way.",
    quote: "“The quarry is brought home, flawless and beyond expectation.”",
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
              A four-fold symphony of intent, deliberation, autonomous execution, and verified
              triumph.
            </p>
          </motion.div>

          <GreekDivider variant="meander" className="max-w-xl mx-auto my-8 opacity-40" />

          {/* Core Formula Banner */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 p-4 border border-gold/30 bg-obsidian-light/80 text-xs sm:text-sm font-cinzel text-parchment">
            <span className="text-gold font-medium">Describe Your Goal</span>
            <span className="text-gold/50">→</span>
            <span className="text-gold font-medium">AI Plans</span>
            <span className="text-gold/50">→</span>
            <span className="text-gold font-medium">AI Executes</span>
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
                  <div className="border border-gold/35 bg-obsidian-light/70 p-6 relative overflow-hidden group hover:border-gold transition-colors duration-300">
                    {/* Watermark Roman Numeral */}
                    <span className="absolute -top-4 -right-2 font-cinzel text-8xl text-gold/5 pointer-events-none select-none group-hover:text-gold/10 transition-colors duration-300">
                      {step.roman}
                    </span>

                    <div className="space-y-4 relative z-10">
                      <div className="w-12 h-12 border border-gold/40 flex items-center justify-center bg-obsidian text-gold">
                        <Icon className="w-6 h-6 stroke-[1.5]" />
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-cinzel text-xs text-gold tracking-[0.25em]">
                          {step.phase}
                        </span>
                        <span className="h-px w-8 bg-gold/30" />
                        <span className="font-cormorant italic text-sm text-parchment/60">
                          Phase {step.roman}
                        </span>
                      </div>

                      <h3 className="font-cinzel text-2xl text-parchment">{step.title}</h3>

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

              {/* Terminal / System Log Preview */}
              <div className="lg:col-span-5 bg-obsidian text-parchment p-5 border border-gold/30 font-mono text-xs space-y-2 rounded-none shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-gold/20 text-[10px] text-gold/70">
                  <span>harpy-agent-kernel · v2.6.4</span>
                  <span className="text-emerald-400">● FLIGHT ACTIVE</span>
                </div>
                <div className="space-y-1 text-parchment/80 pt-1">
                  <p className="text-gold/90">&gt; intent: &quot;Audit Q3 regulatory risk &amp; sync&quot;</p>
                  <p className="text-parchment/60">&gt; resolving dependency DAG (14 nodes)...</p>
                  <p className="text-parchment/60">&gt; dispatching aerial worker: finance-crawler</p>
                  <p className="text-parchment/60">&gt; verifying cross-system invariants: PASS</p>
                  <p className="text-emerald-400">&gt; outcome synthesized in 1.48s</p>
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
            Ready to Unleash Winged Intelligence?
          </h2>
          <p className="font-cormorant italic text-xl text-parchment/75">
            Your intentions are the compass. HARPY AI provides the flight.
          </p>
          <div className="pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gold text-obsidian font-cinzel text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#E2C99A] transition-all duration-300"
            >
              <span>Commence Conversation</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

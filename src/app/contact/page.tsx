"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cdn } from "@/lib/cdn";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle2, Mail, MapPin, Sparkles, Feather } from "lucide-react";
import { GreekDivider } from "@/components/GreekDivider";

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) return;

    setIsSubmitting(true);
    // Simulate swift delivery
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div className="relative w-full overflow-hidden min-h-[90vh] bg-obsidian text-parchment">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* ──────────────────────────────────────────────────────────
          HERO / MASTHEAD — Editorial Contact Header
         ────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-6 lg:px-12 border-b border-gold/20">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-gold/30 text-gold font-cinzel text-xs tracking-[0.3em] uppercase">
            COMMUNICATION PORTAL
          </div>

          <h1 className="font-cinzel text-4xl sm:text-6xl font-normal tracking-tight text-parchment">
            Initiate <span className="text-gold italic font-cormorant">Contact</span>
          </h1>

          <p className="font-cormorant italic text-xl text-parchment/80 font-light max-w-xl mx-auto leading-relaxed">
            Connect your applications or inquire about custom workflows. Tell us what tasks your team
            wants HARPY AI to execute autonomously.
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          MAIN CONTENT — Form & Classical Monograph
         ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-12 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left Column: Classical Sidebar / Office Presence */}
          <div className="lg:col-span-5 space-y-8">
            {/* Architectural Visual Showcase */}
            <div className="border border-gold/30 p-2.5 bg-obsidian-light/70 shadow-xl relative">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                <Image
                  src={cdn("/images/parthenon.jpg")}
                  alt="The Parthenon, Acropolis of Athens"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-60" />
                <span className="absolute bottom-2 left-3 font-cinzel text-[10px] tracking-widest text-gold uppercase">
                  Athenian Acropolis · Seat of Deliberation
                </span>
              </div>
            </div>

            <div className="border border-gold/30 p-8 bg-obsidian-light/60 space-y-8 relative">
              {/* Corner Accents */}
              <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-gold" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-gold" />
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-gold" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-gold" />

              <div className="space-y-3">
                <span className="font-cinzel text-xs text-gold tracking-[0.25em] uppercase">
                  Sanctuaries
                </span>
                <h3 className="font-cinzel text-2xl text-parchment">Global Presences</h3>
                <p className="font-inter text-xs text-parchment/65 leading-relaxed font-light">
                  Bridging historical cradles of philosophy with modern epicenters of cognitive
                  engineering.
                </p>
              </div>

              <div className="space-y-4 text-xs font-inter text-parchment/80">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-parchment block font-cinzel text-xs">
                      Athens Sanctuary
                    </strong>
                    <span className="text-parchment/60">Dionysiou Areopagitou, 105 58 Athens</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-parchment block font-cinzel text-xs">
                      San Francisco Research Hub
                    </strong>
                    <span className="text-parchment/60">Jackson Square, San Francisco, CA</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-parchment block font-cinzel text-xs">
                      London Guild
                    </strong>
                    <span className="text-parchment/60">St. James&apos;s Square, London SW1Y</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gold/15 space-y-2">
                <span className="font-cinzel text-xs text-gold tracking-widest block uppercase">
                  Direct Dispatch
                </span>
                <p className="font-inter text-xs text-parchment/80">council@harpy.ai</p>
                <p className="font-inter text-xs text-parchment/80">research@harpy.ai</p>
              </div>
            </div>

            {/* Classical Epigraph Inset */}
            <div className="p-6 border border-gold/15 bg-obsidian-light/30 text-center space-y-2">
              <p className="font-cormorant italic text-lg text-parchment/75">
                &ldquo;Speech is the mirror of action; let intention be pure, and the flight shall
                be swift.&rdquo;
              </p>
              <span className="font-cinzel text-[10px] tracking-[0.2em] text-gold uppercase block">
                — Epictetus, Discourses
              </span>
            </div>
          </div>

          {/* Right Column: Minimalist Elegant Contact Form */}
          <div className="lg:col-span-7">
            <div className="border border-gold/40 p-8 sm:p-12 bg-obsidian-light/80 shadow-2xl relative">
              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form
                    key="contact-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-8"
                  >
                    <div className="space-y-2">
                      <span className="font-cinzel text-xs text-gold tracking-[0.25em] uppercase">
                        Direct Inquiry
                      </span>
                      <h2 className="font-cinzel text-2xl sm:text-3xl text-parchment">
                        State Your Requirement
                      </h2>
                      <p className="font-inter text-xs sm:text-sm text-parchment/65 font-light">
                        All transmissions are received directly by our architectural research team.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Name Field */}
                      <div className="space-y-2">
                        <label
                          htmlFor="name"
                          className="block font-cinzel text-xs tracking-wider uppercase text-parchment/90"
                        >
                          Name or Title
                        </label>
                        <input
                          id="name"
                          type="text"
                          required
                          value={formState.name}
                          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                          placeholder="e.g. Elena Vance"
                          className="w-full px-4 py-3 bg-obsidian border border-gold/30 text-parchment placeholder-parchment/30 text-sm focus:outline-none focus:border-gold transition-colors duration-200"
                        />
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2">
                        <label
                          htmlFor="email"
                          className="block font-cinzel text-xs tracking-wider uppercase text-parchment/90"
                        >
                          Electronic Mail Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={formState.email}
                          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                          placeholder="e.g. elena@institution.org"
                          className="w-full px-4 py-3 bg-obsidian border border-gold/30 text-parchment placeholder-parchment/30 text-sm focus:outline-none focus:border-gold transition-colors duration-200"
                        />
                      </div>

                      {/* Message Field */}
                      <div className="space-y-2">
                        <label
                          htmlFor="message"
                          className="block font-cinzel text-xs tracking-wider uppercase text-parchment/90"
                        >
                          Your Intended Goal or Inquiry
                        </label>
                        <textarea
                          id="message"
                          rows={6}
                          required
                          value={formState.message}
                          onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                          placeholder="Describe the applications you wish to connect (e.g. Gmail, Notion, WhatsApp, Discord, AI Code Editor, Chrome) and the tasks you want automated..."
                          className="w-full px-4 py-3 bg-obsidian border border-gold/30 text-parchment placeholder-parchment/30 text-sm focus:outline-none focus:border-gold transition-colors duration-200 resize-none"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gold text-obsidian font-cinzel text-xs tracking-[0.22em] uppercase font-semibold transition-all duration-300 hover:bg-[#E2C99A] hover:shadow-[0_0_25px_rgba(198,164,106,0.3)] disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
                            <span>Dispatching Intent...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Message</span>
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-center font-inter text-[11px] text-parchment/40">
                      Dispatched securely under HARPY AI architectural protocols.
                    </p>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success-message"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-16 text-center space-y-6"
                  >
                    <div className="w-16 h-16 border border-gold/50 rounded-full flex items-center justify-center mx-auto bg-obsidian text-gold">
                      <Feather className="w-8 h-8 stroke-[1.4] animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <span className="font-cinzel text-xs text-gold tracking-[0.3em] uppercase">
                        Transmission Confirmed
                      </span>
                      <h3 className="font-cinzel text-3xl text-parchment">
                        Your Intent Has Taken Flight
                      </h3>
                      <p className="font-cormorant italic text-xl text-parchment/80 max-w-md mx-auto leading-relaxed">
                        Thank you, {formState.name}. Our research council has received your inquiry
                        and will reply with winged swiftness.
                      </p>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={() => {
                          setIsSubmitted(false);
                          setFormState({ name: "", email: "", message: "" });
                        }}
                        className="px-6 py-2.5 border border-gold/40 text-gold font-cinzel text-xs uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-all duration-300"
                      >
                        Dispatch Another Transmission
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

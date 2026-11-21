"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Feather {
  id: number;
  x: number;
  delay: number;
  duration: number;
  scale: number;
  rotate: number;
}

export function FloatingFeathers() {
  const [feathers, setFeathers] = useState<Feather[]>([]);

  useEffect(() => {
    // Generate a subtle handful of floating feathers
    const initialFeathers: Feather[] = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      x: Math.random() * 90 + 5, // 5% to 95% width
      delay: i * 2.5,
      duration: 16 + Math.random() * 8, // slow, graceful float (16-24s)
      scale: 0.6 + Math.random() * 0.4,
      rotate: Math.random() * 60 - 30,
    }));
    setFeathers(initialFeathers);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
      {feathers.map((feather) => (
        <motion.div
          key={feather.id}
          className="absolute -top-12 text-gold/30"
          style={{ left: `${feather.x}%` }}
          initial={{ y: -50, opacity: 0, rotate: feather.rotate }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, 25, -20, 15, 0],
            rotate: [feather.rotate, feather.rotate + 45, feather.rotate - 30, feather.rotate],
            opacity: [0, 0.45, 0.6, 0.35, 0],
          }}
          transition={{
            duration: feather.duration,
            delay: feather.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Feather SVG */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: `scale(${feather.scale})` }}
          >
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
            <line x1="16" y1="8" x2="2" y2="22" />
            <line x1="17.5" y1="15" x2="9" y2="15" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

import React from "react";

interface GreekDividerProps {
  className?: string;
  variant?: "meander" | "simple" | "ornate";
  color?: string;
}

export function GreekDivider({ className = "", variant = "meander", color = "currentColor" }: GreekDividerProps) {
  if (variant === "simple") {
    return (
      <div className={`flex items-center justify-center gap-4 my-8 ${className}`}>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <span className="text-gold text-xs tracking-widest font-cinzel">✦</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>
    );
  }

  if (variant === "ornate") {
    return (
      <div className={`flex items-center justify-center gap-3 my-10 ${className}`}>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-gold/50" />
        <div className="flex items-center gap-2 text-gold/80">
          <span className="text-xs">◆</span>
          <span className="text-sm font-cinzel">🏛</span>
          <span className="text-xs">◆</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/30 to-gold/50" />
      </div>
    );
  }

  // Classical Greek Meander Ribbon
  return (
    <div className={`w-full overflow-hidden flex items-center justify-center py-4 select-none opacity-60 ${className}`}>
      <svg
        className="w-full max-w-4xl h-5 text-gold"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 20"
        preserveAspectRatio="repeat-x"
      >
        <pattern id="greek-meander" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 0 10 H 20 V 2 H 36 V 18 H 12 V 6 H 28 V 14 H 20"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
        </pattern>
        <rect width="800" height="20" fill="url(#greek-meander)" />
      </svg>
    </div>
  );
}

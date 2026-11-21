"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

// Inline token renderer (bold, italic, inline code, links)
function renderInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Regex tokens: inline code, bold-italic, bold, italic, links, strikethrough
  const inlineRegex =
    /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|\[[^\]]+\]\([^)]+\)|~~[^~]+~~)/g;

  const parts = text.split(inlineRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#13131C] text-[#C6A46A] font-mono text-[12px] border border-[#22222E]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold-italic: ***text***
    if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
      return (
        <strong key={index} className="font-semibold italic text-[#F2E8D5]">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-[#F2E8D5]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      return (
        <em key={index} className="italic text-[#E8DDC7]/95">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <span key={index} className="line-through text-[#E8DDC7]/50">
          {part.slice(2, -2)}
        </span>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C6A46A] underline decoration-[#C6A46A]/50 hover:text-[#E2C99A] transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 rounded-xl border border-[#1E1E28] bg-[#07070B] overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0E0E16] border-b border-[#1A1A24] text-[11px] font-mono text-[#E8DDC7]/60">
        <span className="uppercase text-[#C6A46A] font-semibold">{language || "Code"}</span>
        <button
          onClick={handleCopy}
          className="hover:text-[#C6A46A] transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-[#E8DDC7]/90 leading-relaxed [scrollbar-width:none]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split lines
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ──────────────────────────────────────────────────────────
    // 1. CODE BLOCKS: ```lang ... ```
    // ──────────────────────────────────────────────────────────
    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <CodeBlock
          key={`code-${i}`}
          code={codeLines.join("\n")}
          language={language}
        />
      );
      continue;
    }

    // ──────────────────────────────────────────────────────────
    // 2. TABLES: | col 1 | col 2 |
    // ──────────────────────────────────────────────────────────
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      // Collect table lines
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Parse header
        const rawHeaders = tableLines[0]
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        // Check if second line is divider |---|---|
        const hasDivider = tableLines[1].includes("---") || tableLines[1].includes("-|-");
        const bodyStart = hasDivider ? 2 : 1;

        const bodyRows = tableLines.slice(bodyStart).map((rowLine) =>
          rowLine
            .split("|")
            .map((c) => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        );

        elements.push(
          <div
            key={`table-${i}`}
            className="my-3.5 overflow-x-auto rounded-xl border border-[#1E1E28] bg-[#07070B] shadow-xl"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0E0E16] border-b border-[#1E1E28] text-[#C6A46A] font-cinzel">
                <tr>
                  {rawHeaders.map((headerText, hIdx) => (
                    <th
                      key={hIdx}
                      className="py-2.5 px-3.5 font-semibold uppercase tracking-wider text-[11px]"
                    >
                      {renderInlineText(headerText)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#14141C]">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-[#0D0D14] transition-colors"
                  >
                    {row.map((cellText, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-2.5 px-3.5 text-[#E8DDC7]/85 font-light leading-relaxed align-top"
                      >
                        {renderInlineText(cellText)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // ──────────────────────────────────────────────────────────
    // 3. HEADINGS: #, ##, ###, ####
    // ──────────────────────────────────────────────────────────
    if (line.startsWith("#")) {
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        if (level === 1) {
          elements.push(
            <h1
              key={`h1-${i}`}
              className="font-cinzel text-xl text-[#E8DDC7] font-semibold mt-4 mb-2 border-b border-[#1A1A24] pb-1.5"
            >
              {renderInlineText(headingText)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2
              key={`h2-${i}`}
              className="font-cinzel text-base sm:text-lg text-[#C6A46A] font-semibold mt-3.5 mb-2"
            >
              {renderInlineText(headingText)}
            </h2>
          );
        } else if (level === 3) {
          elements.push(
            <h3
              key={`h3-${i}`}
              className="font-cinzel text-sm sm:text-base text-[#E8DDC7] font-medium mt-3 mb-1.5"
            >
              {renderInlineText(headingText)}
            </h3>
          );
        } else {
          elements.push(
            <h4
              key={`h4-${i}`}
              className="font-cinzel text-xs uppercase tracking-wider text-[#C6A46A] font-semibold mt-2.5 mb-1"
            >
              {renderInlineText(headingText)}
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // ──────────────────────────────────────────────────────────
    // 4. BLOCKQUOTES: > quote
    // ──────────────────────────────────────────────────────────
    if (line.trim().startsWith(">")) {
      const quoteText = line.trim().replace(/^>\s*/, "");
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-[#C6A46A] pl-3.5 py-1 my-2 bg-[#0C0C12]/50 rounded-r-lg text-[#E8DDC7]/80 italic font-cormorant text-base leading-relaxed"
        >
          {renderInlineText(quoteText)}
        </blockquote>
      );
      i++;
      continue;
    }

    // ──────────────────────────────────────────────────────────
    // 5. HORIZONTAL RULES: --- or ***
    // ──────────────────────────────────────────────────────────
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={`hr-${i}`} className="border-[#1E1E28] my-3.5" />);
      i++;
      continue;
    }

    // ──────────────────────────────────────────────────────────
    // 6. LISTS: Bullet (- / *) or Numbered (1. / 2.)
    // ──────────────────────────────────────────────────────────
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
    const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const text = bulletMatch[3];
      elements.push(
        <div
          key={`bullet-${i}`}
          className={`flex items-start gap-2.5 my-1 ${
            indent > 0 ? "ml-5" : "ml-1"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#C6A46A] mt-2 flex-shrink-0" />
          <span className="text-[#E8DDC7]/90 leading-relaxed font-light text-sm">
            {renderInlineText(text)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    if (numberMatch) {
      const num = numberMatch[2];
      const text = numberMatch[3];
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1 ml-1">
          <span className="font-mono text-xs text-[#C6A46A] font-semibold min-w-[1.2rem] mt-0.5 flex-shrink-0">
            {num}.
          </span>
          <span className="text-[#E8DDC7]/90 leading-relaxed font-light text-sm">
            {renderInlineText(text)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // ──────────────────────────────────────────────────────────
    // 7. EMPTY LINES & REGULAR PARAGRAPHS
    // ──────────────────────────────────────────────────────────
    if (line.trim() === "") {
      elements.push(<div key={`space-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Standard text paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="text-[#E8DDC7]/90 leading-relaxed font-light text-sm my-1"
      >
        {renderInlineText(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 font-inter">{elements}</div>;
}

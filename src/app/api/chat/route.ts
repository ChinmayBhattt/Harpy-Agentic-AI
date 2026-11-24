import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed serverless duration on standard Vercel accounts

const HARPY_SYSTEM_PROMPT = `You are HARPY AI, the sovereign autonomous agent named after the swift-winged spirits of antiquity.
You are capable of executing actions across user-authenticated applications: Gmail, Notion, WhatsApp, Instagram, AI Code Editors (Cursor/VS Code), Discord, and Google Chrome.

When responding to tasks or queries:
1. Speak with precision, authority, and classical elegance.
2. Structure your answers with executive elegance and rich formatting:
   - Organize answers with bold headings (## or ###) and structured bullet points.
   - Use clean Markdown comparison tables (| Feature | Option A | Option B |) when comparing tools, tradeoffs, metrics, or frameworks.
   - Highlight key terminology and terms in **bold** and *italics*.
   - Use code blocks with appropriate language tags for code, terminal commands, or configurations.
   - Keep answers visually striking, deeply informative, and professional like an elite executive briefing.
3. Keep answers clean, well-formatted, and helpful without unnecessary metadata blocks.`;

const TAVILY_API_KEY =
  process.env.TAVILY_API_KEY || "tvly-2y78Uu-eSek3YU0jBjOtRI2K7kPAXi1l1DuGKRFC9wBG52AQz";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

async function fetchTavilyWebSearch(query: string): Promise<string | null> {
  if (!TAVILY_API_KEY || !query || query.trim().length < 3) return null;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query.trim(),
        search_depth: "basic",
        include_answer: true,
        max_results: 5,
      }),
    });

    if (!res.ok) {
      console.warn("Tavily search status:", res.status);
      return null;
    }

    const data = await res.json();
    const answer = data.answer ? `Direct Summary: ${data.answer}\n\n` : "";
    const results = Array.isArray(data.results)
      ? data.results
          .slice(0, 5)
          .map(
            (r: TavilySearchResult, idx: number) =>
              `[Source ${idx + 1}] ${r.title} (${r.url}):\n${r.content}`
          )
          .join("\n\n")
      : "";

    if (!answer && !results) return null;
    return `${answer}Live Web Search Results:\n${results}`;
  } catch (err) {
    console.error("Tavily search error:", err);
    return null;
  }
}

function detectProvider(key: string, passedProvider?: string): {
  provider: "groq" | "openai" | "anthropic";
  defaultModel: string;
} {
  const clean = key.trim();
  if (passedProvider && (passedProvider === "groq" || passedProvider === "openai" || passedProvider === "anthropic")) {
    return {
      provider: passedProvider,
      defaultModel:
        passedProvider === "groq"
          ? "openai/gpt-oss-120b"
          : passedProvider === "openai"
          ? "gpt-4o"
          : "claude-3-5-sonnet-20241022",
    };
  }

  if (clean.startsWith("gsk_")) {
    return { provider: "groq", defaultModel: "openai/gpt-oss-120b" };
  }
  if (clean.startsWith("sk-ant-")) {
    return { provider: "anthropic", defaultModel: "claude-3-5-sonnet-20241022" };
  }
  if (clean.startsWith("sk-")) {
    return { provider: "openai", defaultModel: "gpt-4o" };
  }

  return { provider: "groq", defaultModel: "openai/gpt-oss-120b" };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, model, apiKey, messages } = body;

    const cleanKey = (apiKey && typeof apiKey === "string" && apiKey.trim() !== "")
      ? apiKey.trim()
      : (process.env.GROQ_API_KEY || "").trim();

    if (!cleanKey) {
      return NextResponse.json(
        { error: "No API key configured. Please add an API key in System Settings." },
        { status: 400 }
      );
    }

    const detected = detectProvider(cleanKey, provider);
    const chosenProvider = detected.provider;
    const initialModel = model || detected.defaultModel;

    // Standardize input messages: [{ role: 'user' | 'assistant' | 'system', content: string }]
    const formattedMessages = Array.isArray(messages)
      ? messages.map((m: { sender?: string; role?: string; text?: string; content?: string }) => ({
          role: m.role || (m.sender === "harpy" ? "assistant" : "user"),
          content: m.content || m.text || "",
        }))
      : [];

    const lastUserMessage = [...formattedMessages].reverse().find((m) => m.role === "user")?.content || "";

    // ──────────────────────────────────────────────────────────
    // TAVILY REAL-TIME LIVE WEB SEARCH
    // ──────────────────────────────────────────────────────────
    let webContext: string | null = null;
    if (lastUserMessage && lastUserMessage.trim().length > 2) {
      webContext = await fetchTavilyWebSearch(lastUserMessage);
    }

    const effectiveSystemPrompt = webContext
      ? `${HARPY_SYSTEM_PROMPT}\n\n[REAL-TIME LIVE INTERNET SEARCH VIA TAVILY AI]:\n${webContext}\n\nINSTRUCTION: You have access to real-time live internet search results provided via Tavily Search above. Use this live factual information to accurately answer the user's question, provide current updates, and cite relevant sources or links when helpful.`
      : HARPY_SYSTEM_PROMPT;

    // ──────────────────────────────────────────────────────────
    // 1. GROQ INFERENCE (With Auto-Fallback)
    // ──────────────────────────────────────────────────────────
    if (chosenProvider === "groq") {
      const candidateModels = [
        initialModel,
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
        "allam-2-7b",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
      ].filter(Boolean);
      const uniqueModels = Array.from(new Set(candidateModels));

      let lastError = "";

      for (const currentModel of uniqueModels) {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: "system", content: effectiveSystemPrompt },
              ...formattedMessages,
            ],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const outputText = groqData?.choices?.[0]?.message?.content || "";

          return NextResponse.json({
            text: outputText,
            provider: "groq",
            model: currentModel,
          });
        }

        const errJson = await groqRes.json().catch(() => ({}));
        const errDetail = errJson?.error?.message || groqRes.statusText || "Groq API error";
        lastError = `Groq Error (${groqRes.status}): ${errDetail}`;

        // If it's an auth error (401), don't retry other models
        if (groqRes.status === 401 || !errDetail.includes("model")) {
          return NextResponse.json({ error: lastError }, { status: groqRes.status });
        }
      }

      return NextResponse.json({ error: lastError }, { status: 400 });
    }

    // ──────────────────────────────────────────────────────────
    // 2. OPENAI INFERENCE
    // ──────────────────────────────────────────────────────────
    if (chosenProvider === "openai") {
      const candidateModels = [initialModel, "gpt-4o-mini", "gpt-4o"];
      const uniqueModels = Array.from(new Set(candidateModels));
      let lastError = "";

      for (const currentModel of uniqueModels) {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: "system", content: effectiveSystemPrompt },
              ...formattedMessages,
            ],
            temperature: 0.7,
          }),
        });

        if (openaiRes.ok) {
          const openaiData = await openaiRes.json();
          const outputText = openaiData?.choices?.[0]?.message?.content || "";

          return NextResponse.json({
            text: outputText,
            provider: "openai",
            model: currentModel,
          });
        }

        const errJson = await openaiRes.json().catch(() => ({}));
        lastError = errJson?.error?.message || openaiRes.statusText || "OpenAI API error";
        if (openaiRes.status === 401) {
          return NextResponse.json({ error: `OpenAI Error: ${lastError}` }, { status: 401 });
        }
      }

      return NextResponse.json({ error: `OpenAI Error: ${lastError}` }, { status: 400 });
    }

    // ──────────────────────────────────────────────────────────
    // 3. ANTHROPIC (CLAUDE) INFERENCE
    // ──────────────────────────────────────────────────────────
    if (chosenProvider === "anthropic") {
      const anthropicMessages = formattedMessages.filter(
        (m: { role: string }) => m.role === "user" || m.role === "assistant"
      );

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": cleanKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: initialModel,
          system: effectiveSystemPrompt,
          messages: anthropicMessages,
          max_tokens: 2048,
        }),
      });

      if (!claudeRes.ok) {
        const errJson = await claudeRes.json().catch(() => ({}));
        const errDetail = errJson?.error?.message || claudeRes.statusText || "Claude API error";
        return NextResponse.json(
          { error: `Anthropic Error (${claudeRes.status}): ${errDetail}` },
          { status: claudeRes.status }
        );
      }

      const claudeData = await claudeRes.json();
      const outputText = claudeData?.content?.[0]?.text || "";

      return NextResponse.json({
        text: outputText,
        provider: "anthropic",
        model: initialModel,
      });
    }

    return NextResponse.json(
      { error: "Unsupported API Key format." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: `Harpy Kernel Gateway Error: ${message}` }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, provider } = await req.json();

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const cleanKey = apiKey.trim();
    const cleanProvider = (provider || "").toLowerCase();

    // ──────────────────────────────────────────────────────────
    // GROQ CLOUD LIVE MODELS
    // ──────────────────────────────────────────────────────────
    if (cleanProvider === "groq" || cleanKey.startsWith("gsk_")) {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: "Failed to validate Groq API key" },
          { status: res.status }
        );
      }

      const data = await res.json();
      const rawList = Array.isArray(data?.data) ? data.data : [];

      // Filter text chat models and format
      const chatModels = rawList
        .filter(
          (m: { id: string }) =>
            !m.id.includes("whisper") &&
            !m.id.includes("guard") &&
            !m.id.includes("tts")
        )
        .map((m: { id: string }) => {
          let name = m.id;
          if (m.id.includes("llama-3.1-8b")) name = "Llama 3.1 8B Instant";
          else if (m.id.includes("llama-3.3-70b")) name = "Llama 3.3 70B";
          else if (m.id.includes("mixtral-8x7b")) name = "Mixtral 8x7B";
          else if (m.id.includes("gemma2")) name = "Gemma 2 9B";
          else if (m.id.includes("qwen")) name = "Qwen";

          return {
            id: m.id,
            name: name,
            speed: m.id.includes("8b") ? "Ultra-Fast (700+ tok/s)" : "Fast (300+ tok/s)",
          };
        });

      return NextResponse.json({
        provider: "groq",
        providerName: "Groq Cloud",
        models: chatModels.length > 0 ? chatModels : [
          { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", speed: "Ultra-Fast" },
          { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", speed: "Fast" },
        ],
      });
    }

    // ──────────────────────────────────────────────────────────
    // OPENAI LIVE MODELS
    // ──────────────────────────────────────────────────────────
    if (cleanProvider === "openai" || (cleanKey.startsWith("sk-") && !cleanKey.startsWith("sk-ant-"))) {
      return NextResponse.json({
        provider: "openai",
        providerName: "OpenAI",
        models: [
          { id: "gpt-4o", name: "GPT-4o", speed: "Fast" },
          { id: "gpt-4o-mini", name: "GPT-4o Mini", speed: "Ultra-Fast" },
        ],
      });
    }

    // ──────────────────────────────────────────────────────────
    // ANTHROPIC CLAUDE MODELS
    // ──────────────────────────────────────────────────────────
    if (cleanProvider === "anthropic" || cleanKey.startsWith("sk-ant-")) {
      return NextResponse.json({
        provider: "anthropic",
        providerName: "Anthropic Claude",
        models: [
          { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", speed: "Deep Reasoning" },
          { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", speed: "Ultra-Fast" },
        ],
      });
    }

    return NextResponse.json({
      provider: "groq",
      providerName: "Groq Cloud",
      models: [
        { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", speed: "Ultra-Fast" },
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

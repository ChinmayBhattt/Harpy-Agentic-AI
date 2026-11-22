import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const clientApiKey = (formData.get("apiKey") as string) || "";
    const effectiveKey = clientApiKey.trim() || process.env.GROQ_API_KEY || "";

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!effectiveKey) {
      return NextResponse.json(
        { error: "No API key provided. Please connect your Groq or OpenAI key in the model selector." },
        { status: 401 }
      );
    }

    // If starts with gsk_ or default, use Groq Whisper (ultra-fast whisper-large-v3-turbo)
    const isGroq = effectiveKey.startsWith("gsk_") || !effectiveKey.startsWith("sk-");
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/audio/transcriptions"
      : "https://api.openai.com/v1/audio/transcriptions";

    const model = isGroq ? "whisper-large-v3-turbo" : "whisper-1";

    const whisperData = new FormData();
    whisperData.append("file", file, isGroq ? "audio.webm" : "audio.mp4");
    whisperData.append("model", model);
    whisperData.append("response_format", "json");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${effectiveKey}`,
      },
      body: whisperData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || response.statusText || "Transcription failed";
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (error: any) {
    console.error("Transcribe API route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during transcription" },
      { status: 500 }
    );
  }
}

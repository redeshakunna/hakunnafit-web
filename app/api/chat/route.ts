import { NextRequest, NextResponse } from "next/server";
import { HAKUNNAFIT_SYSTEM_PROMPT } from "@/lib/chatbot-knowledge";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "El asistente aún no está configurado (falta ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m): m is ChatMessage =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0
  );

  if (!messages.length) {
    return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
  }

  // Recorta historial y longitud para mantener costos/latencia bajo control.
  const trimmed = messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_MESSAGE_LENGTH),
  }));

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: HAKUNNAFIT_SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Anthropic API error:", upstream.status, detail);
      return NextResponse.json(
        { error: "El asistente no está disponible en este momento. Intenta de nuevo." },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const reply: string =
      data?.content?.find((block: { type: string }) => block.type === "text")?.text ??
      "Disculpa, no pude generar una respuesta. ¿Puedes reformular tu pregunta?";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Error llamando a Anthropic:", err);
    return NextResponse.json(
      { error: "El asistente no está disponible en este momento. Intenta de nuevo." },
      { status: 502 }
    );
  }
}

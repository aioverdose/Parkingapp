const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function ollamaChatMessages(messages: OllamaMessage[]): Promise<string> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      console.warn(`Ollama returned ${res.status}, falling back to template`);
      return "";
    }

    const data = await res.json();
    return data.message?.content ?? "";
  } catch {
    return "";
  }
}

export async function ollamaChat(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  return ollamaChatMessages([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

export function isOllamaAvailable(): boolean {
  return !!process.env.OLLAMA_BASE_URL || false;
}

import { logger } from "@/lib/logger";

export type LlmProvider = "ollama" | "openai" | "none";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProviderConfig {
  name: Exclude<LlmProvider, "none">;
  chat: (messages: LlmMessage[]) => Promise<string>;
}

function getOpenAiConfig(): ProviderConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  return {
    name: "openai",
    async chat(messages) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: 512 }),
      });
      if (!res.ok) return "";
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}

function getOllamaConfig(): ProviderConfig | null {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim();
  if (!baseUrl) return null;

  const model = process.env.OLLAMA_MODEL?.trim() || "llama3";

  return {
    name: "ollama",
    async chat(messages) {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      if (!res.ok) return "";
      const data = await res.json();
      return data.message?.content ?? "";
    },
  };
}

/**
 * Resolves the ordered provider chain for the current environment.
 * - LLM_PROVIDER="openai" -> OpenAI first, Ollama second.
 * - LLM_PROVIDER="ollama" -> Ollama first.
 * - Default: OpenAI if configured, otherwise Ollama (the original local default).
 */
export function llmProviders(): ProviderConfig[] {
  const preferred = process.env.LLM_PROVIDER?.trim().toLowerCase() ?? "";
  const openai = getOpenAiConfig();
  const ollama = getOllamaConfig();

  if (preferred === "openai") {
    return [openai, ollama].filter(Boolean) as ProviderConfig[];
  }
  if (preferred === "ollama") {
    return [ollama, openai].filter(Boolean) as ProviderConfig[];
  }
  if (openai) {
    return [openai, ollama].filter(Boolean) as ProviderConfig[];
  }
  return [ollama].filter(Boolean) as ProviderConfig[];
}

export function activeProviderName(): LlmProvider {
  const providers = llmProviders();
  return providers.length > 0 ? providers[0].name : "none";
}

/**
 * Runs the configured provider chain and returns the first non-empty reply.
 * Returns "" when every provider is unavailable or fails, so callers can fall
 * back to their local templates (the established contract).
 */
export async function chatCompletion(messages: LlmMessage[]): Promise<string> {
  const providers = llmProviders();
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      const reply = await provider.chat(messages);
      if (reply && reply.trim()) {
        return reply;
      }
      failures.push(`${provider.name}: empty reply`);
    } catch (err) {
      failures.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failures.length > 0) {
    logger.warn("llm: all providers failed, using template fallback", { failures });
  }
  return "";
}

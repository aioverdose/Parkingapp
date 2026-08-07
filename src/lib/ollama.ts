import { chatCompletion, llmProviders, type LlmMessage } from "@/lib/llm";

export interface OllamaMessage extends LlmMessage {}

export async function ollamaChatMessages(messages: OllamaMessage[]): Promise<string> {
  return chatCompletion(messages);
}

export async function ollamaChat(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  return chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

export function isOllamaAvailable(): boolean {
  return llmProviders().some((p) => p.name === "ollama");
}

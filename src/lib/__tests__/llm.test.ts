import { describe, it, expect, afterEach, vi } from "vitest";
import { chatCompletion, activeProviderName, llmProviders } from "../llm";

const envs = [
  "LLM_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("llmProviders", () => {
  it("returns no providers when nothing is configured", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "");
    expect(llmProviders()).toHaveLength(0);
    expect(activeProviderName()).toBe("none");
  });

  it("prefers OpenAI when both are configured", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
    expect(activeProviderName()).toBe("openai");
  });

  it("honors LLM_PROVIDER=ollama", () => {
    vi.stubEnv("LLM_PROVIDER", "ollama");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
    expect(activeProviderName()).toBe("ollama");
    const providers = llmProviders();
    expect(providers.map((p) => p.name)).toEqual(["ollama", "openai"]);
  });

  it("uses Ollama when it is the only provider configured", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
    expect(activeProviderName()).toBe("ollama");
  });
});

describe("chatCompletion", () => {
  it("returns empty string when no provider is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OLLAMA_BASE_URL", "");
    await expect(chatCompletion([{ role: "user", content: "hi" }])).resolves.toBe("");
  });

  it("returns the OpenAI reply on success", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "openai answer" } }],
      }),
    } as Response);

    const reply = await chatCompletion([{ role: "user", content: "hi" }]);
    expect(reply).toBe("openai answer");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer sk-test" }),
      }),
    );
  });

  it("falls back to Ollama when OpenAI fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: "ollama answer" } }),
      } as Response);

    const reply = await chatCompletion([{ role: "user", content: "hi" }]);
    expect(reply).toBe("ollama answer");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns empty string when every provider fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(chatCompletion([{ role: "user", content: "hi" }])).resolves.toBe("");
  });
});

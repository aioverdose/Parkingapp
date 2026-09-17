import { chatCompletion, type LlmMessage } from "@/lib/llm";

type GitHubTreeItem = { path: string; type: string; size?: number };

function repositoryConfig() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repository = process.env.GITHUB_REPOSITORY?.trim() || "aioverdose/Parkingapp";
  if (!token) return null;
  const [owner, name] = repository.split("/");
  if (!owner || !name) throw new Error("GITHUB_REPOSITORY must use owner/repository format");
  return { token, owner, name, branch: process.env.GITHUB_DEFAULT_BRANCH?.trim() || "main" };
}

async function githubFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = repositoryConfig();
  if (!config) throw new Error("GitHub development agent is not configured. Set GITHUB_TOKEN in Vercel.");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function relevantPaths(tree: GitHubTreeItem[], task: string) {
  const terms = task.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 3);
  const preferred = ["package.json", "README.md", "tsconfig.json", "src/app", "src/components", "src/lib", "supabase/migrations"];
  return tree.filter((item) => item.type === "blob" && (item.size ?? 0) < 60_000).sort((a, b) => {
    const score = (path: string) => (terms.some((term) => path.toLowerCase().includes(term)) ? 10 : 0) + (preferred.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ? 2 : 0);
    return score(b.path) - score(a.path);
  }).slice(0, 18).map((item) => item.path);
}

export async function getRepositoryContext(task: string) {
  const config = repositoryConfig();
  if (!config) throw new Error("GitHub development agent is not configured. Set GITHUB_TOKEN in Vercel.");
  const tree = await githubFetch<{ tree: GitHubTreeItem[] }>(`/repos/${config.owner}/${config.name}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`);
  const paths = relevantPaths(tree.tree || [], task);
  const files = await Promise.all(paths.map(async (path) => {
    try {
      const file = await githubFetch<{ content?: string; encoding?: string }>(`/repos/${config.owner}/${config.name}/contents/${path}?ref=${encodeURIComponent(config.branch)}`);
      const content = file.encoding === "base64" ? Buffer.from(file.content || "", "base64").toString("utf8") : file.content || "";
      return `### ${path}\n\`\`\`\n${content.slice(0, 20_000)}\n\`\`\``;
    } catch { return `### ${path}\n(unable to read file)`; }
  }));
  return { repository: `${config.owner}/${config.name}`, branch: config.branch, paths, context: files.join("\n\n") };
}

export async function developmentAgentReply(messages: LlmMessage[]) {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) throw new Error("Describe the development task first.");
  const repository = await getRepositoryContext(lastUser.content);
  const system = `You are an expert software development agent operating in an OpenCode-style workflow for a Next.js 16, React, TypeScript, Supabase repository.
Work like a senior engineer: inspect relevant code, identify root causes, propose the smallest safe change, call out auth/data/security risks, and specify verification commands.
You have read-only GitHub repository context in this request. Do not claim that you edited files, ran commands, or opened a pull request. Return:
1. Findings
2. Proposed changes with exact file paths
3. Verification steps
4. Any required environment variables, migrations, or deployment notes.
The product must preserve tenant isolation and must never promise reserved or guaranteed parking.
Repository: ${repository.repository}\nBranch: ${repository.branch}\nRelevant files:\n${repository.context}`;
  const reply = await chatCompletion([{ role: "system", content: system }, ...messages.slice(-12)]);
  return { reply: reply || "The configured LLM did not return a development analysis.", repository, engine: "github-context" as const };
}
   
export function isDevelopmentAgentConfigured() { return Boolean(repositoryConfig()); }

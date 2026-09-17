import dns from "node:dns/promises";
import net from "node:net";

export const MAX_RESEARCH_URLS = 8;
export const MAX_RESEARCH_RESPONSE_BYTES = 1_024 * 1_024;
const MAX_REDIRECTS = 2;

export type ResearchSource = { url: string; title: string; snippet: string };

function blockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const addressType = net.isIP(host);
  if (addressType === 4) {
    const parts = host.split(".").map(Number);
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
  }
  if (addressType === 6) {
    return host === "::1" || host === "::" || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb") || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("::ffff:10.") || host.startsWith("::ffff:127.") || host.startsWith("::ffff:192.168.") || host.startsWith("::ffff:172.");
  }
  return false;
}

export async function validateResearchUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || (url.port && url.port !== "80" && url.port !== "443") || blockedHostname(url.hostname)) return null;
  if (net.isIP(url.hostname) === 0) {
    try {
      const addresses = await dns.lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true });
      if (addresses.some(({ address }) => blockedHostname(address))) return null;
    } catch { return null; }
  }
  return url;
}

function decodeEntities(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " " }[entity.toLowerCase()] ?? entity));
}

export function htmlToResearchText(html: string) {
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim()).slice(0, 240);
  const text = decodeEntities(html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<noscript\b[\s\S]*?<\/noscript>|<title\b[\s\S]*?<\/title>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 32_000);
  return { title, snippet: text.slice(0, 1_200) };
}

async function readBounded(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESEARCH_RESPONSE_BYTES) { await reader.cancel(); throw new Error("Source response exceeds 1 MB"); }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchResearchSource(input: string): Promise<ResearchSource | null> {
  let url = await validateResearchUrl(input);
  if (!url) return null;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, { redirect: "manual", signal: controller.signal, headers: { Accept: "text/html,application/xhtml+xml" } });
      if (response.status >= 300 && response.status < 400) {
        if (redirects === MAX_REDIRECTS) return null;
        const location = response.headers.get("location");
        if (!location) return null;
        url = await validateResearchUrl(new URL(location, url).toString());
        if (!url) return null;
        continue;
      }
      if (!response.ok || !(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) return null;
      const parsed = htmlToResearchText(await readBounded(response));
      return { url: url.toString(), ...parsed };
    } finally { clearTimeout(timer); }
  }
  return null;
}

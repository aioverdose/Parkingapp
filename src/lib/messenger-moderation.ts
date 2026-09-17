export type ModerationDecision = "allowed" | "flagged" | "blocked";
export type ModerationSeverity = "low" | "medium" | "high" | "critical";

export type ModerationLabel =
  | "threats_violence"
  | "payment_deposit"
  | "passwords_verification_codes"
  | "contact_sharing"
  | "suspicious_links"
  | "harassment_coercion"
  | "illegal_parking_instructions";

export type ModerationResult = {
  decision: ModerationDecision;
  severity: ModerationSeverity;
  confidence: number;
  labels: ModerationLabel[];
  reason: string;
  user_facing_warning: string | null;
  requires_human_review: boolean;
  provider: "rules";
};

export interface ModerationProvider {
  moderate(content: string): ModerationResult;
}

type Rule = {
  label: ModerationLabel;
  pattern: RegExp;
  severity: ModerationSeverity;
  confidence: number;
  reason: string;
};

const rules: Rule[] = [
  { label: "threats_violence", pattern: /\b(?:kill|hurt|shoot|stab|bomb|assault|beat you|i(?:'ll| will) harm)\b/i, severity: "critical", confidence: 0.98, reason: "Threat or violence language" },
  { label: "payment_deposit", pattern: /\b(?:pay|payment|deposit|venmo|cashapp|zelle|paypal|wire|send money|fee)\b.{0,40}\b(?:me|now|first|before|to)\b|\b(?:venmo|cashapp|zelle|paypal)\b/i, severity: "critical", confidence: 0.96, reason: "Payment or deposit request" },
  { label: "passwords_verification_codes", pattern: /\b(?:password|passcode|verification code|security code|one[- ]time code|otp|2fa|login code|ssn|social security)\b/i, severity: "critical", confidence: 0.99, reason: "Credential or verification-code request" },
  { label: "contact_sharing", pattern: /(?:\b\d{3}[-. )]?\d{3}[-. ]?\d{4}\b|\b[\w.+-]+@[\w-]+\.[\w.-]+\b|\b(?:text|call|email|contact|reach me)\b.{0,30}\b(?:me|at)\b)/i, severity: "medium", confidence: 0.9, reason: "Phone, email, or off-platform contact sharing" },
  { label: "suspicious_links", pattern: /\b(?:https?:\/\/|www\.)[^\s]+|\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl)\/[^\s]+/i, severity: "high", confidence: 0.94, reason: "Link requiring safety review" },
  { label: "harassment_coercion", pattern: /\b(?:idiot|stupid|loser|shut up|do it or else|you better|or else|i(?:'ll| will) find you)\b/i, severity: "medium", confidence: 0.86, reason: "Harassment or coercive language" },
  { label: "illegal_parking_instructions", pattern: /\b(?:park|parking)\b.{0,50}\b(?:fire hydrant|handicap|disabled|no parking|tow zone|blocking|sidewalk|bus stop|double park|illegal)\b/i, severity: "high", confidence: 0.93, reason: "Instructions to park illegally or obstruct access" },
];

const severityRank: Record<ModerationSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export class RulesModerationProvider implements ModerationProvider {
  moderate(content: string): ModerationResult {
    const matches = rules.filter((rule) => rule.pattern.test(content));
    if (!matches.length) {
      return { decision: "allowed", severity: "low", confidence: 0.99, labels: [], reason: "No moderation rules matched", user_facing_warning: null, requires_human_review: false, provider: "rules" };
    }

    const severity = matches.reduce((highest, rule) => severityRank[rule.severity] > severityRank[highest] ? rule.severity : highest, "low" as ModerationSeverity);
    const confidence = Math.max(...matches.map((match) => match.confidence));
    const critical = severity === "critical" && confidence >= 0.95;
    const review = critical || severityRank[severity] >= 1;
    return {
      decision: critical ? "blocked" : review ? "flagged" : "allowed",
      severity,
      confidence,
      labels: [...new Set(matches.map((match) => match.label))],
      reason: matches.map((match) => match.reason).join("; "),
      user_facing_warning: critical ? "This message cannot be sent because it may create a safety or payment risk." : review ? "This message was sent for a quick safety review." : null,
      requires_human_review: review,
      provider: "rules",
    };
  }
}

export const defaultModerationProvider: ModerationProvider = new RulesModerationProvider();

export function moderateMessengerMessage(content: string, provider: ModerationProvider = defaultModerationProvider): ModerationResult {
  return provider.moderate(content);
}

export function moderationEvidence(result: ModerationResult): string {
  return JSON.stringify({ provider: result.provider, severity: result.severity, confidence: result.confidence, reason: result.reason, warning: result.user_facing_warning, requires_human_review: result.requires_human_review });
}

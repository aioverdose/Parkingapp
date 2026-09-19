export const MAX_POTENTIAL_MESSAGE_LENGTH = 500;

export function sanitizePotentialMessage(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_POTENTIAL_MESSAGE_LENGTH);
}

export const POTENTIAL_MESSAGE_ACTIONS = ["end_conversation", "cancel_coordination"] as const;

export const MAX_MESSENGER_MESSAGE_LENGTH = 500;

const unsafeContent = [
  /\b(?:kill|hurt|shoot|bomb)\b/i,
  /\b(?:credit\s*card|ssn|social\s+security)\b/i,
];

export function validateMessengerMessage(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return "Message cannot be empty";
  if (trimmed.length > MAX_MESSENGER_MESSAGE_LENGTH) {
    return `Message too long (max ${MAX_MESSENGER_MESSAGE_LENGTH} chars)`;
  }
  if (unsafeContent.some((pattern) => pattern.test(trimmed))) {
    return "Message needs review before it can be sent";
  }
  return null;
}

export function isChatParticipant(
  userId: string,
  chat: { sender_id: string; receiver_id: string },
): boolean {
  return chat.sender_id === userId || chat.receiver_id === userId;
}

export function isChatUsable(chat: { status: string; expires_at: string; conversation_ended_at?: string | null }): string | null {
  if (chat.status !== "active") return "Chat is no longer active";
  if (chat.conversation_ended_at) return "Chat has ended";
  if (new Date(chat.expires_at).getTime() <= Date.now()) return "Chat has expired";
  return null;
}

export const MAX_CREDIT_QUANTITY = 100;

export interface PurchaseMetadata {
  userId: string;
  quantity: number;
}

/**
 * Validates and parses the metadata attached to a Stripe checkout session.
 * Returns null when the metadata is missing or out of range so webhooks can
 * reject malformed sessions instead of granting bad credit amounts.
 */
export function parsePurchaseMetadata(
  metadata: Record<string, string> | null | undefined,
): PurchaseMetadata | null {
  const userId = metadata?.userId;
  const quantity = Number(metadata?.quantity ?? "1");

  if (!userId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CREDIT_QUANTITY) {
    return null;
  }

  return { userId, quantity };
}

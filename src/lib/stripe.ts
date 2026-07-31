import Stripe from "stripe";

let lazyStripe: Stripe | null = null;

function getKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe not configured");
  return key;
}

export function getStripe(): Stripe {
  if (!lazyStripe) {
    lazyStripe = new Stripe(getKey(), { apiVersion: "2026-07-29.dahlia" });
  }
  return lazyStripe;
}

function createLazyProxy(): Stripe {
  const handler: ProxyHandler<Stripe> = {
    get(_target, prop) {
      const s = getStripe();
      const value = (s as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof value === "function") {
        return value.bind(s);
      }
      return value;
    },
  };
  return new Proxy({} as Stripe, handler);
}

export const stripe = createLazyProxy();

const CREDIT_PRICE_CENTS = 599; // $5.99 per match credit

export function getCreditPriceCents() {
  return CREDIT_PRICE_CENTS;
}

export async function createCreditCheckoutSession({
  userId,
  userEmail,
  quantity = 1,
  origin,
}: {
  userId: string;
  userEmail: string;
  quantity: number;
  origin: string;
}) {
  const totalCents = CREDIT_PRICE_CENTS * quantity;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    metadata: { userId, quantity: String(quantity) },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Match Credits",
            description: `${quantity} match credit${quantity > 1 ? "s" : ""} for ParkingMeeters`,
          },
          unit_amount: CREDIT_PRICE_CENTS,
        },
        quantity,
      },
    ],
    success_url: `${origin}/profile?purchase=success`,
    cancel_url: `${origin}/profile?purchase=cancelled`,
  });

  return { url: session.url, sessionId: session.id };
}

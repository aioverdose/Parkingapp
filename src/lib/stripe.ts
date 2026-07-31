import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

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

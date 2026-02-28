import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Tornade Unlock",
              description: "Unlock Tornade full features",
            },
            unit_amount: 1999, // $19.99 in cents
          },
          quantity: 1,
        },
      ],
      success_url: "https://tornade.app/success",
      cancel_url: "https://tornade.app/cancel",
      customer_email_collection: "required", // ← Forces email input
    });

    console.log(`✅ Checkout session created: ${session.id}`);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("❌ Failed to create checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const HMAC_SECRET =
  process.env.TORNADE_LICENSE_SECRET || "tornade-license-secret-v1";

/**
 * Generates a Tornade license key in format:
 * TORNADE-XXXXXXXX-XXXXXXXX-XXXXXXXX-CHECKSUM
 * where CHECKSUM is the first 4 chars of HMAC-SHA256(payload)
 */
function generateLicenseKey(): string {
  const segment1 = crypto.randomBytes(4).toString("hex").toUpperCase();
  const segment2 = crypto.randomBytes(4).toString("hex").toUpperCase();
  const segment3 = crypto.randomBytes(4).toString("hex").toUpperCase();

  const payload = `${segment1}-${segment2}-${segment3}`;
  const checksum = computeHmac(payload);

  return `TORNADE-${payload}-${checksum}`;
}

/**
 * Computes HMAC-SHA256 checksum (first 4 chars in uppercase)
 */
function computeHmac(payload: string): string {
  const hash = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(payload)
    .digest("hex");
  return hash.substring(0, 4).toUpperCase();
}

/**
 * Sends license key via email using Resend
 */
async function sendLicenseEmail(
  email: string,
  licenseKey: string
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "Tornade <noreply@tornade.app>",
      to: email,
      subject: "Votre clé de licence Tornade",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Merci pour votre achat !</h2>
          <p>Voici votre clé de licence Tornade. Entrez-la dans l'app pour activer votre copie.</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <code style="font-family: 'Menlo', 'Monaco', monospace; font-size: 16px; font-weight: 500; letter-spacing: 2px;">
              ${licenseKey}
            </code>
          </div>

          <p style="color: #666; font-size: 14px;">
            <strong>Instructions :</strong>
          </p>
          <ol style="color: #666; font-size: 14px;">
            <li>Ouvrez Tornade</li>
            <li>Cliquez sur "Activer la licence"</li>
            <li>Collez votre clé ci-dessus</li>
            <li>Profitez de Tornade !</li>
          </ol>

          <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            © 2026 Tornade. Tous droits réservés.
          </p>
        </div>
      `,
    });

    console.log(`✅ License email sent to ${email}`);
  } catch (error) {
    console.error("❌ Failed to send license email:", error);
    throw error;
  }
}

/**
 * Webhook endpoint for Stripe payment_intent.succeeded events
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("❌ Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_ENDPOINT_SECRET || ""
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("❌ Webhook signature verification failed:", errorMessage);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle payment_intent.succeeded
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const email = paymentIntent.receipt_email;

    console.log(`📧 Processing payment for ${email}`);

    if (!email) {
      console.error("❌ Payment intent missing receipt email");
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    try {
      // Generate license key
      const licenseKey = generateLicenseKey();
      console.log(`🔑 Generated license key for ${email}`);

      // Send email
      await sendLicenseEmail(email, licenseKey);

      // Log for debugging (in production, you might store in a database)
      console.log(
        `✅ Success: License key issued`,
        JSON.stringify(
          {
            email,
            licenseKey,
            stripePaymentId: paymentIntent.id,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Error processing payment:", errorMessage);
      return NextResponse.json(
        { error: "Failed to process license" },
        { status: 500 }
      );
    }
  }

  // Ignore other event types
  console.log(`ℹ️ Ignoring event type: ${event.type}`);
  return NextResponse.json({ received: true });
}

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
      from: "Tornade <noreply@tornade.tf>",
      to: email,
      subject: "Your Tornade License Key",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://tornade.tf/images/tornade.png" alt="Tornade" style="width: 250px; height: 250px; object-fit: contain;">
          </div>

          <h2 style="text-align: center; margin-top: 0;">Thank You for Your Purchase!</h2>
          <p style="text-align: center; color: #666;">Here is your Tornade license key. Enter it in the app to activate your copy.</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
            <code style="font-family: 'Menlo', 'Monaco', monospace; font-size: 16px; font-weight: 500; letter-spacing: 2px;">
              ${licenseKey}
            </code>
          </div>

          <p style="color: #666; font-size: 14px; margin-bottom: 12px;">
            <strong>How to activate:</strong>
          </p>
          <ol style="color: #666; font-size: 14px; margin-left: 20px;">
            <li>Open Tornade</li>
            <li>Click "Activate License"</li>
            <li>Paste your key above</li>
            <li>Start enjoying Tornade!</li>
          </ol>

          <p style="color: #999; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
            © 2026 Tornade. All rights reserved.
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
 * Webhook endpoint for Stripe checkout.session.completed events
 * Processes successful payments and issues license keys
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

  // Only process checkout.session.completed events
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  // Handle checkout.session.completed (from Stripe Checkout)
  const session = event.data.object as Stripe.Checkout.Session;

  const email =
    session.customer_email || session.customer_details?.email || null;

  console.log(`📧 Processing checkout session for ${email}`);

  if (!email) {
    console.error("❌ Checkout session missing customer email");
    console.error("Session ID:", session.id);
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  try {
    // Generate license key
    const licenseKey = generateLicenseKey();
    console.log(`🔑 Generated license key for ${email}`);

    // Send email
    await sendLicenseEmail(email, licenseKey);

    // Log for debugging
    console.log(
      `✅ Success: License key issued`,
      JSON.stringify(
        {
          email,
          licenseKey,
          stripeSessionId: session.id,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error processing checkout session:", errorMessage);
    return NextResponse.json(
      { error: "Failed to process license" },
      { status: 500 }
    );
  }
}

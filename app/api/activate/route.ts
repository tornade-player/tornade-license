import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

if (!process.env.TORNADE_LICENSE_SECRET) {
  throw new Error("Missing required env var: TORNADE_LICENSE_SECRET");
}
const HMAC_SECRET = process.env.TORNADE_LICENSE_SECRET;

const MAX_ACTIVATIONS = parseInt(process.env.MAX_ACTIVATIONS ?? "5", 10);

/**
 * Validates a license key format: TORNADE-XXXXXXXX-XXXXXXXX-XXXXXXXX-CHECKSUM
 * Checksum is the first 4 chars of HMAC-SHA256(payload) in uppercase.
 */
function validateKeyFormat(key: string): boolean {
  const parts = key.split("-");
  if (parts.length !== 5 || parts[0] !== "TORNADE") return false;
  const payload = parts.slice(1, 4).join("-");
  const expected = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(payload)
    .digest("hex")
    .substring(0, 4)
    .toUpperCase();
  return parts[4] === expected;
}

/**
 * Computes the activation token: full HMAC-SHA256(key:deviceId) in uppercase.
 * Validated offline in the Swift app using the same embedded secret.
 */
function computeActivationToken(key: string, deviceId: string): string {
  return crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(`${key}:${deviceId}`)
    .digest("hex")
    .toUpperCase();
}

/**
 * POST /api/activate
 * Body: { key: string, deviceId: string }
 * Returns: { token: string } on success
 * Errors: 400 invalid_request, 422 invalid_key, 429 max_activations_reached
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).key !== "string" ||
    typeof (body as Record<string, unknown>).deviceId !== "string"
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { key, deviceId } = body as { key: string; deviceId: string };
  const normalizedKey = key.toUpperCase().trim();

  if (!validateKeyFormat(normalizedKey)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 422 });
  }

  const kvKey = `activations:${normalizedKey}`;
  const deviceIds: string[] = (await redis.get<string[]>(kvKey)) ?? [];

  // Idempotent: already registered for this device
  if (deviceIds.includes(deviceId)) {
    const token = computeActivationToken(normalizedKey, deviceId);
    return NextResponse.json({ token });
  }

  // Enforce activation limit
  if (deviceIds.length >= MAX_ACTIVATIONS) {
    console.warn(
      `⚠️ Max activations reached for key ${normalizedKey.slice(-4)}`
    );
    return NextResponse.json(
      { error: "max_activations_reached" },
      { status: 429 }
    );
  }

  // Register new device
  deviceIds.push(deviceId);
  await redis.set(kvKey, deviceIds);

  const token = computeActivationToken(normalizedKey, deviceId);
  console.log(
    `✅ Activated key ...${normalizedKey.slice(-4)} for device ${deviceId.slice(0, 8)}...`
  );
  return NextResponse.json({ token });
}

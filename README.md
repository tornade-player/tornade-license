# 🎵 Tornade License Server

Stripe webhook handler for Tornade license key generation. Automatically generates and emails license keys when a payment succeeds.

## Features

- ✅ Stripe webhook handling (`payment_intent.succeeded`)
- ✅ HMAC-SHA256 license key generation (compatible with tornade-gui)
- ✅ Email delivery via Resend
- ✅ Zero-cost deployment on Vercel
- ✅ TypeScript + Next.js

## Architecture

```
Stripe Payment
    ↓
Webhook → /api/webhooks/stripe
    ↓
Generate Key (HMAC-SHA256)
    ↓
Send Email (Resend)
    ↓
Customer receives license key
```

## Setup

### 1. Clone & Install

```bash
git clone git@github.com:tornade-player/tornade-license.git
cd tornade-license
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_ENDPOINT_SECRET=whsec_...
RESEND_API_KEY=re_...
TORNADE_LICENSE_SECRET=tornade-license-secret-v1
```

**Where to get these:**

- **STRIPE_SECRET_KEY**: Stripe Dashboard → Developers → API Keys → Secret Key
- **STRIPE_ENDPOINT_SECRET**: Will be generated after you add the webhook endpoint
- **RESEND_API_KEY**: Resend.com → API Keys
- **TORNADE_LICENSE_SECRET**: Keep in sync with `DirectLicenseChecker.swift` in tornade-gui

### 3. Local Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Test with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Trigger test webhook
stripe trigger payment_intent.succeeded
```

Check the console output to verify the license key was generated.

## Deployment on Vercel

### 1. Push to GitHub

```bash
git push origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com
2. New Project → Import your repo
3. Set environment variables (same as `.env.local`)
4. Deploy

### 3. Configure Stripe Webhook

1. Stripe Dashboard → Developers → Webhooks → Add Endpoint
2. Endpoint URL: `https://your-vercel-url.vercel.app/api/webhooks/stripe`
3. Events: Select `payment_intent.succeeded`
4. Copy the "Signing secret" (`whsec_...`) → Add to Vercel env vars as `STRIPE_ENDPOINT_SECRET`

## License Key Format

```
TORNADE-XXXXXXXX-XXXXXXXX-XXXXXXXX-CHECKSUM
```

Where:
- First 3 segments: Random hex (4 bytes each)
- Last segment: First 4 chars of HMAC-SHA256 checksum

Example: `TORNADE-A1B2C3D4-E5F6G7H8-I9J0K1L2-8F2A`

## Integration with tornade-gui

The license key is validated in `tornade-gui/Tornade/Services/DirectLicenseChecker.swift`:

```swift
private func validate(key: String) -> Bool {
    let parts = key.split(separator: "-").map(String.init)
    guard parts.count == 5, parts[0] == "TORNADE" else { return false }

    let payload = parts[1...3].joined(separator: "-")
    let expectedChecksum = hmacChecksum(for: payload)
    return parts[4] == expectedChecksum
}
```

**Important:** The `hmacSecret` in `DirectLicenseChecker.swift` must match `TORNADE_LICENSE_SECRET` in this server.

## File Structure

```
tornade-license/
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts          # Main webhook handler
│   ├── layout.tsx                     # Root layout
│   └── page.tsx                       # Home page
├── .env.example                       # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md                          # This file
```

## Logging

All events are logged to console. In production, you can redirect logs to:
- Vercel Analytics
- Sentry
- LogRocket
- etc.

Example log output:

```
📧 Processing payment for user@example.com
🔑 Generated license key for user@example.com
✅ License email sent to user@example.com
✅ Success: License key issued
{
  "email": "user@example.com",
  "licenseKey": "TORNADE-A1B2C3D4-E5F6G7H8-I9J0K1L2-8F2A",
  "stripePaymentId": "pi_1234567890",
  "timestamp": "2026-02-27T10:30:00.000Z"
}
```

## Troubleshooting

### Webhook not triggering
- Check Stripe Dashboard → Webhooks → Recent Deliveries
- Verify `STRIPE_ENDPOINT_SECRET` matches the webhook secret
- Check firewall/CORS (Vercel should be accessible)

### Email not sent
- Verify `RESEND_API_KEY` is correct
- Check Resend Dashboard → Emails for delivery status
- Verify sender domain is verified in Resend

### License key validation fails
- Ensure `TORNADE_LICENSE_SECRET` matches in both:
  - This server (`.env.local`)
  - `DirectLicenseChecker.swift` in tornade-gui
- Check license key format: should be `TORNADE-XXXX-XXXX-XXXX-XXXX`

## License

Private • Proprietary © 2026 Tornade

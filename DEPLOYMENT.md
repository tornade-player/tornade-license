# 🚀 Deployment Guide

Complete step-by-step guide to deploy Tornade License Server on Vercel.

## Prerequisites

- ✅ GitHub account (public or private repo)
- ✅ Vercel account (free tier sufficient)
- ✅ Stripe account with API keys
- ✅ Resend account with API key

## Step 1: Create GitHub Repository

### If using GitHub CLI:

```bash
gh repo create tornade-license \
  --private \
  --source=/Users/thomas/Apps/tornade-license \
  --remote=origin \
  --push
```

### Or manually:

1. Go to https://github.com/new
2. Repository name: `tornade-license`
3. Make it **Private**
4. Create repository
5. Follow GitHub's instructions to push your local repo

```bash
cd /Users/thomas/Apps/tornade-license
git remote add origin https://github.com/YOUR_USERNAME/tornade-license.git
git branch -M main
git push -u origin main
```

## Step 2: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy **Secret Key** (starts with `sk_live_` or `sk_test_`)
3. Save it somewhere safe

You'll get the webhook secret later.

## Step 3: Get Resend API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Copy and save it

## Step 4: Create Vercel Project

### Option A: Automatic (recommended)

1. Go to https://vercel.com/new
2. Select "Other" → Import Git Repository
3. Paste your GitHub repo URL
4. Click "Import"
5. Skip environment variables for now (we'll add them next)
6. Click "Deploy"

### Option B: Via Vercel CLI

```bash
npm install -g vercel
cd /Users/thomas/Apps/tornade-license
vercel --prod
```

## Step 5: Configure Environment Variables on Vercel

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add these variables:

| Variable | Value | Source |
|----------|-------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard |
| `RESEND_API_KEY` | `re_...` | Resend Dashboard |
| `TORNADE_LICENSE_SECRET` | `tornade-license-secret-v1` | **Keep this secret!** |
| `STRIPE_ENDPOINT_SECRET` | (will add next) | |

4. Click "Save"

**Note:** Environment variables are **not** visible in your logs or repository.

## Step 6: Add Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add Endpoint"
3. Endpoint URL:
   ```
   https://your-vercel-project.vercel.app/api/webhooks/stripe
   ```
   (replace `your-vercel-project` with your Vercel project name)

4. Events to send: Select only `payment_intent.succeeded`
5. Click "Add Endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

## Step 7: Add Webhook Secret to Vercel

1. Go back to Vercel project settings
2. Environment Variables
3. Add new variable:
   - Key: `STRIPE_ENDPOINT_SECRET`
   - Value: `whsec_...` (the secret from Stripe)
4. Save

## Step 8: Test the Webhook

### Using Stripe CLI:

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# List webhooks to verify
stripe listen --api-key sk_live_YOUR_KEY

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

You should see output like:
```
📧 Processing payment for test@example.com
🔑 Generated license key for test@example.com
✅ License email sent to test@example.com
```

**Note:** Resend in test mode may not actually send emails. Use the Resend Dashboard to verify.

## Step 9: Verify Email Delivery

1. Go to https://resend.com/emails
2. Check if test emails appear in the list
3. If using a real Stripe account with a real customer email, verify that person receives the license key

## Step 10: Update tornade-gui

Update `LicenseGateView.swift` to point to your Stripe checkout:

```swift
Link(String(localized: "license.purchase.linkLabel"),
     destination: URL(string: "https://your-tornade-app.com/buy")!)
```

You can create a simple landing page on your server or use Stripe's hosted checkout.

## Monitoring

### View Logs

**Vercel:**
```bash
vercel logs --prod
```

**Or in Vercel Dashboard:**
1. Go to project
2. Deployments → Latest → Function logs

### Check Stripe Events

https://dashboard.stripe.com/webhooks → Select endpoint → Recent deliveries

## Troubleshooting

### Webhook returns 400 Bad Request

**Cause:** `STRIPE_ENDPOINT_SECRET` mismatch
- Go to Stripe Dashboard → Webhooks
- Copy the exact signing secret again
- Update `STRIPE_ENDPOINT_SECRET` in Vercel

### Email not received

**Cause:** Resend API key issues or domain verification
1. Check Resend Dashboard → Emails for failures
2. Verify sender domain is set to `noreply@tornade.app` (or your domain)
3. In development, Resend sends to console; in production, verify API key

### License key validation fails in tornade-gui

**Cause:** `TORNADE_LICENSE_SECRET` mismatch
- Ensure this server's secret matches `DirectLicenseChecker.swift`
- Check spelling exactly

## Next Steps

1. Test a real payment on your Stripe test account
2. Create Stripe product for Tornade
3. Add pricing tier for direct downloads
4. Create landing page or checkout flow
5. Update tornade-gui with the buy link

## Support

If deployment fails:
1. Check Vercel build logs: Dashboard → Deployments → Failed deployment
2. Check Stripe webhook logs: https://dashboard.stripe.com/webhooks
3. Check Resend email logs: https://resend.com/emails

## Security Notes

- ✅ Environment variables are encrypted and never exposed
- ✅ Webhook signatures are verified (STRIPE_ENDPOINT_SECRET)
- ✅ HMAC checksums prevent license key forgery
- ✅ Email is sent only after successful payment verification
- ⚠️ Never commit `.env.local` (already in `.gitignore`)
- ⚠️ Keep `TORNADE_LICENSE_SECRET` consistent across systems

## Production Checklist

Before going live:

- [ ] Switch Stripe to live mode (not test mode)
- [ ] Verify all environment variables on Vercel
- [ ] Test end-to-end: payment → email → license key
- [ ] Create Stripe product with correct pricing
- [ ] Update tornade-gui buy link
- [ ] Create privacy policy for email handling
- [ ] Monitor first week of customer payments

# Render Environment Variables Setup

Add the following environment variables in your Render dashboard under **Environment**:

## Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Already set in render.yaml |
| `DATABASE_URL` | (auto-linked) | From Neon database |
| `JWT_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Required for auth tokens |
| `FRONTEND_URL` | `https://www.tradematch.uk` | Your production frontend domain |
| `BACKEND_URL` | `https://tradematch.onrender.com` | Your production backend URL |
| `CORS_ORIGINS` | `https://www.tradematch.uk,https://tradematch.uk` | Comma-separated allowed origins |

## Email (Resend)

| Variable | Value | Notes |
|----------|-------|-------|
| `RESEND_API_KEY` | Your Resend API key (starts with `re_`) | Get from https://resend.com |
| `EMAIL_FROM` | `noreply@tradematch.uk` | Sender email (must be verified in Resend) |
| `EMAIL_FROM_JOBS` | `jobs@tradematch.uk` | (Optional) Override for job notifications |
| `EMAIL_FROM_NOTIFICATIONS` | `notifications@tradematch.uk` | (Optional) Override for system notifications |
| `EMAIL_FROM_PAYMENTS` | `payments@tradematch.uk` | (Optional) Override for payment emails |
| `EMAIL_FROM_REVIEWS` | `reviews@tradematch.uk` | (Optional) Override for review reminders |

## OAuth (Google)

| Variable | Value | Notes |
|----------|-------|-------|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | Get from https://console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | Keep private |

## OAuth (Microsoft)

| Variable | Value | Notes |
|----------|-------|-------|
| `MICROSOFT_CLIENT_ID` | From Azure Portal | Get from https://portal.azure.com |
| `MICROSOFT_CLIENT_SECRET` | From Azure Portal | Keep private |

## Payment (Stripe)

| Variable | Value | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | From Stripe dashboard | Get from https://dashboard.stripe.com (test or live key) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook config | Webhook signing secret |

## Optional AI Services

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENAI_API_KEY` | (optional) | Get from https://platform.openai.com |
| `CLAUDE_API_KEY` | (optional) | Get from https://console.anthropic.com |

---

## Quick Setup Checklist

- [ ] Set all **Required Variables** above
- [ ] Set all **Email (Resend)** variables
- [ ] Set **OAuth** variables (Google and/or Microsoft)
- [ ] Set **Stripe** variables (if using payments)
- [ ] Optional: Set AI variables
- [ ] After adding variables, manually redeploy service in Render dashboard

## Testing After Setup

Once variables are added and redeployed, test:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://tradematch.onrender.com/api/health"

# Test email (basic send)
$headers = @{"Content-Type" = "application/json"}
$body = '{"to":"your@email.com","subject":"Test","html":"<p>Hello</p>"}'
Invoke-WebRequest -Method Post -Uri "https://tradematch.onrender.com/api/email/send" -Headers $headers -Body $body

# Test welcome email (template)
$body = '{"email":"your@email.com","name":"Test User","userType":"customer"}'
Invoke-WebRequest -Method Post -Uri "https://tradematch.onrender.com/api/email/welcome" -Headers $headers -Body $body
```

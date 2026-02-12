# TradeMatch Settings - Extended Features Specification

## New Features to Implement

### 1. Business Profile Section
- Business Description (500-700 chars)
- Years in Business dropdown
- Primary Trades multi-select
- Work Photos Upload (up to 10)
- Portfolio with drag/drop reordering

### 2. Verification & Trust Section
- Verification Status Badge (Not Verified / Pending / Verified)
- Company Registration Number input
- Insurance checkbox
- Document uploads (Incorporation, Insurance, Trade Accreditations)
- **Verified Business Badge: £4.99/month** (UPDATED PRICE)

### 3. Service Area Coverage (NEW)
- Postcode cap: **10 districts included**
- Progress indicator (e.g., "7 / 10 used")
- **Postcode Expansion Packages:**
  - Starter: +5 postcodes - £9.99/month
  - Growth: +15 postcodes - £24.99/month  
  - Power: +30 postcodes - £39.99/month

### 4. Postcode Intelligence (NEW)
- Saturation warnings (Low/Moderate/High competition)
- AI-suggested postcodes with opportunity scores
- Distance-based recommendations
- Feature-gated (Free vs Pro)

### 5. Insurance Auto-Validation (NEW)
- Document upload with auto-extraction
- Insurer name, policy number, expiry validation
- Expiry monitoring with 30-day alerts
- Status tracking (Not Submitted / Pending / Auto-Validated / Expired)

### 6. Risk Scoring (Internal, Admin-Only)
- Trading Standards screening
- Companies House integration
- Risk bands (Low / Medium / High)
- Never shown publicly

### 7. Public Profile Preview
- Live preview of how profile appears to customers
- Shows all verified badges and trust signals

## Monetization Strategy
- Base account: 10 postcodes (free)
- Verified Badge: £4.99/month
- Postcode expansions: £9.99 - £39.99/month
- Total possible ARPU: £44.98/month+ for power users

## Technical Integration Points
- Stripe subscription management
- Companies House API
- Document OCR/parsing
- Postcode saturation analytics
- Risk scoring engine

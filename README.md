# Honda Motorcycle Showroom (Pakistan)

A digital motorcycle showroom, accessories & riding gear store, and workshop service platform built for Pakistan (`PKR`, `Asia/Karachi`), with a role-based showroom admin console and Supabase + Cloudflare Pages deployment readiness.

> **Disclaimer:** Brand name (`site_settings.brand_name`, default `"Honda"`), brand subtitle (`site_settings.brand_subtitle`, default `"SHOWROOM"`), legal business name, branch addresses, and all motorcycle prices/specifications are sample placeholders editable from the Admin Console (`/admin/settings`). Default logo SVG is an original speedometer/wheel emblem; no official manufacturer endorsement is implied.

---

## Core Workflows

1. **Motorcycle Showroom Flow (Bike Flow)**
   - Browse & filter catalog (`/bikes`), view detailed specs/variants/colors (`/bikes/:slug`), compare up to 3 models (`/compare`), calculate estimated installments (`/emi-calculator`), use the 4-step Guided Bike Finder (`/find-your-perfect-bike`), request a test ride (`/test-ride`), submit an old-bike trade-in valuation (`/trade-in`), or reserve a bike with a token deposit (`/book/:bikeSlug`).
   - Balance payment, inspection, registration, and delivery are completed offline at the showroom and tracked via a 7-step registration stepper in `/account/bookings/:bookingNumber`.
2. **Accessories & Parts Store Flow (Store Flow)**
   - Browse & filter helmets, riding gear, lubricants, and spare parts (`/accessories`), filter by bike compatibility, add variants to cart (`/cart`), and check out (`/checkout`) with branch pickup or delivery zone shipping, coupon codes, loyalty points redemption, COD (under `cod_max_amount`), or bank transfer proof upload.
3. **Workshop Service Booking (`/service-booking`)**
   - Schedule Periodic Maintenance, General Repair, Warranty Check, or Inspection by branch, date, and slot capacity, and view verified service history in `/account/service`.
4. **Role-Based Admin Console (`/admin`)**
   - Supports canonical roles: `super_admin`, `manager`, `sales_staff`, `service_staff`, `content_editor`, `accountant`.
   - Manages Motorcycles & Price History, Branch Stock, Accessories & Compatibility, Bookings & 7-Step Registration Progress, Inquiries, Test Rides, Trade-ins, Orders & Couriers, Payments & Refunds, Returns, Service Appointments & History, Customers & Loyalty Points, CMS (Banners, Offers, News & Updates, FAQs, Static Pages, Branches, Coupons, Delivery Zones), Reports & CSV Export, Site Settings & EMI Plans, Staff Roles, and Audit Log.

---

## Brand & Assets Replacement

- **Live Brand Customization:** Update `Brand Name`, `Brand Subtitle`, `Logo Image URL`, and social links anytime under **Admin → Settings** (`/admin/settings`). When `logo_url` is blank, the app renders the built-in inline SVG speedometer/wheel emblem (`src/components/brand/Logo.tsx`).
- **Static Placeholder Assets (replace before final launch):**
  - `public/favicon.svg` — Browser SVG tab icon
  - `public/apple-touch-icon.png` — 180×180 iOS home-screen placeholder
  - `public/og-default.png` — 1200×630 OpenGraph / Twitter social share card placeholder

---

## Environment Variables

### 1. Frontend Build Variables (`VITE_*` — Safe for Browser)
Configure these in **Cloudflare → Workers & Pages → Settings → Environment Variables** (or `.env.local` locally):

| Variable | Required | Where to Get It |
|---|---|---|
| `NODE_VERSION` | **Yes (`20`)** | Build runtime version (`20`) matching `.nvmrc` and `package.json` `engines.node` |
| `VITE_SUPABASE_URL` | For live backend | Supabase Dashboard → **Project Settings → API → Project URL** |
| `VITE_SUPABASE_ANON_KEY` | For live backend | Supabase Dashboard → **Project Settings → API → `anon` public key** |
| `VITE_SITE_URL` | Recommended | Your production domain (e.g. `https://showroom.example.pk`) for `og:image`, canonical URLs, and `robots.txt` sitemap |
| `VITE_WHATSAPP_NUMBER` | Optional | Default showroom WhatsApp number in digits (`923XXXXXXXXX`) |
| `VITE_ANALYTICS_ID` | Optional | Google Analytics 4 measurement ID (`G-XXXXXXXXXX`) |
| `VITE_TURNSTILE_SITE_KEY` | Optional | Cloudflare Dashboard → **Turnstile → Site Key** |

> **Demo Fallback Mode:** If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset, both `npm run build` and the live app run cleanly with a `"Backend not configured"` notice and labeled sample data persisted in `localStorage` (`honda_showroom_demo_state_v1`).

### 2. Cloudflare Pages Functions Secrets (Server-Side Only — Never Prefix with `VITE_`)
Configure these as **Encrypted Secrets** in Cloudflare Dashboard if enabling server-side `/functions/api/*` endpoints:

| Secret Name | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase Project URL for server-side REST calls |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` secret key (used by payment callbacks & dynamic `sitemap.xml` only; never exposed to client) |
| `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT`, `JAZZCASH_API_URL` | JazzCash server-side payment gateway credentials |
| `EASYPAISA_STORE_ID`, `EASYPAISA_HASH_KEY`, `EASYPAISA_API_URL` | Easypaisa server-side payment gateway credentials |
| `EMAIL_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Transactional email provider credentials & sender address |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server-side verification secret |

---

## Deploying to Cloudflare (Workers & Pages via GitHub)

### Step-by-Step Deployment
1. **Push to GitHub:** Commit your code ensuring only `package-lock.json` is present (no `bun.lock`, `yarn.lock`, or `pnpm-lock.yaml`).
2. **Import Repo in Cloudflare:**
   - Open **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
   - Select your GitHub repository and production branch (`main`).
3. **Build Configuration:**
   - **Framework preset:** `Vite` (or `React (Vite)`)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Set Environment Variables:**
   - Add `NODE_VERSION` = `20` (Production & Preview).
   - Add your `VITE_*` variables from the table above (and encrypted server secrets if using `/functions/api/*`).
5. **Deploy:** Click **Save and Deploy**. Cloudflare installs dependencies using `.npmrc` (`legacy-peer-deps=true`), runs `tsc --noEmit && vite build`, and publishes `dist/` alongside `public/_redirects` and `public/_headers`.
6. **Custom Domain & SSL:**
   - Go to **Custom domains → Set up a custom domain**, add `yourdomain.pk` (and `www.yourdomain.pk`), and point DNS via Cloudflare CNAME.
   - Ensure SSL/TLS mode is **Full (strict)** and set `VITE_SITE_URL=https://yourdomain.pk` then trigger a redeploy so `og:image` and `robots.txt` use your final domain.

### Pre-Deploy Checklist
- [ ] Only `package-lock.json` exists in repo root (no `bun.lock` / `bun.lockb` / `yarn.lock` / `pnpm-lock.yaml`)
- [ ] `.npmrc` contains `legacy-peer-deps=true`
- [ ] `.nvmrc` contains `20` and Cloudflare `NODE_VERSION=20` is set
- [ ] `public/_redirects` contains `/*  /index.html  200` (prevents 404 on SPA route refresh like `/bikes/cd-70`, `/account/orders`, `/admin/bikes`)
- [ ] `public/_headers` configures security headers and `/assets/*` immutable caching
- [ ] Fresh `npm install && npm run build` passes locally with zero errors
- [ ] No `.env` file or `SUPABASE_SERVICE_ROLE_KEY` committed to Git

### Common Cloudflare Build Failure Fixes
| Symptom / Error | Cause & Fix |
|---|---|
| `bun install` fails or peer dependency mismatch | Cloudflare detected `bun.lock` instead of `package-lock.json`. Delete `bun.lock`, ensure `.npmrc` has `legacy-peer-deps=true`, and commit refreshed `package-lock.json`. |
| Unsupported Node / Vite syntax error | Default Cloudflare Node image was `< 20`. Add `.nvmrc` (`20`) and set `NODE_VERSION=20` in Cloudflare Build Environment Variables. |
| 404 Not Found when refreshing `/bikes/...` or `/admin/...` | Missing SPA fallback. Ensure `public/_redirects` has `/*  /index.html  200` and is copied into `dist/_redirects`. |
| Build fails on `functions/api/*` types | Keep `functions/tsconfig.json` isolated and `functions` excluded in root `tsconfig.json`. |
| Case-sensitive module not found on Linux | macOS/Windows ignores filename casing while Cloudflare builds on Linux. Ensure every import path matches exact file casing on disk. |
| White screen when Supabase env vars missing | Always use `import.meta.env.VITE_*` safely; never throw at module top level when `VITE_SUPABASE_URL` is empty. |

---

## Local Development

```bash
npm install
npm run dev
```

Type-check and build:

```bash
npm run lint
npm run build
```

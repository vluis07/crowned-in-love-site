# Crowned In Love — custom storefront

A Cloudflare Pages site with server-side Functions that connect Stripe (payment)
to Printify (fulfillment). No cart/checkout SaaS in the middle — you own every
part of it, which also means you own keeping it running.

## How an order flows

1. Shopper browses `/` — the product grid is pulled live from your Printify
   shop via `/api/products` (cached 1 hour in KV).
2. On `/product.html`, they pick a variant and add to a cart stored in the
   browser (localStorage) — nothing server-side yet.
3. `/cart.html` posts the cart to `/api/checkout`, which stores a pending
   order row in D1 and creates a Stripe Checkout Session, then redirects to
   Stripe's hosted payment page.
4. After payment, Stripe calls your `/api/webhook` endpoint. It verifies the
   signature, looks up the pending order, and calls the Printify API to
   create the real order — this is the step that actually puts it into
   production.
5. `/success.html` polls `/api/order/:id` until it shows `submitted` (or
   `failed`, in which case you'll want to follow up manually — the customer
   has already paid).

## One-time setup

### 1. Install Wrangler and log in
```
npm install -g wrangler
wrangler login
```

### 2. Create the D1 database
```
wrangler d1 create crowned-in-love-orders
```
Copy the `database_id` it prints into `wrangler.toml`.

Apply the schema:
```
wrangler d1 execute crowned-in-love-orders --file=./schema.sql --remote
```

### 3. Create the KV namespace (product cache)
```
wrangler kv namespace create PRODUCTS_CACHE
```
Copy the `id` it prints into `wrangler.toml`.

### 4. Set your secrets
These are never written to a file in this repo on purpose.
```
wrangler pages secret put PRINTIFY_API_TOKEN
wrangler pages secret put PRINTIFY_SHOP_ID
wrangler pages secret put STRIPE_SECRET_KEY
```
- Printify token: Printify account → Connections → generate a Personal Access Token.
- Printify shop ID: `GET https://api.printify.com/v1/shops.json` with that token — the `id` field.
- Stripe secret key: Stripe Dashboard → Developers → API keys (use the **test** key first).

### 5. Deploy once, then wire up the Stripe webhook
```
wrangler pages deploy public
```
Note the `*.pages.dev` URL it gives you (or your custom domain once attached),
and update `SITE_URL` in `wrangler.toml` to match.

In the Stripe Dashboard → Developers → Webhooks, add an endpoint pointing to:
```
https://YOUR-SITE/api/webhook
```
Listen for `checkout.session.completed`. Stripe will show you a signing
secret (`whsec_...`) — set it:
```
wrangler pages secret put STRIPE_WEBHOOK_SECRET
```

### 6. Deploy again so the new SITE_URL and webhook take effect
```
wrangler pages deploy public
```

## Testing before going live

- Use Stripe **test mode** keys and Stripe's test card `4242 4242 4242 4242`
  to run a full order through without a real charge.
- Use `stripe listen --forward-to https://YOUR-SITE/api/webhook` (Stripe CLI)
  to test the webhook locally before deploying, or just test against your
  deployed Pages URL directly — Cloudflare Pages Functions work the same in
  preview and production.
- Check a completed test order actually appears in Printify → Orders. That's
  the step most worth verifying by hand before real money moves.

## Going live

Swap in your live Stripe secret key and live webhook signing secret
(Stripe test and live mode have separate webhooks/keys), then do one real
low-value order yourself to confirm shipping address and sizing come through
to Printify correctly.

## Known limits of this build (be aware)

- **Shipping method is hardcoded** to `1` (standard) in
  `functions/lib/printify.js` — check what shipping methods your specific
  print providers support and adjust if needed.
- **No tax calculation.** Stripe Checkout can add this via Stripe Tax, but
  it's not wired up here — you're responsible for sales tax compliance if
  you enable it.
- **No inventory limits / no login system** — this is a simple storefront,
  not a full commerce platform. Fine for a small catalog; you'd want more
  (accounts, order history, saved carts) at real scale.
- **Failed Printify submissions after successful payment** are marked
  `failed` in D1 rather than retried automatically — check the `orders`
  table periodically, or add an alert (e.g. email yourself) in the `catch`
  block in `functions/api/webhook.js`.

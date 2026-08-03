CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,             -- our order id, sent to Stripe as metadata and to Printify as external_id
  cart_json TEXT NOT NULL,          -- snapshot of the cart at checkout time
  status TEXT NOT NULL DEFAULT 'pending', -- pending -> submitted | failed
  printify_order_id TEXT,
  customer_email TEXT,
  error TEXT,
  created_at INTEGER NOT NULL
);

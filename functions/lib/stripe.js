const STRIPE_BASE = 'https://api.stripe.com/v1';

// Stripe's API takes application/x-www-form-urlencoded with PHP-style bracket
// notation for nested objects/arrays. This recursively flattens a JS object
// into that format so we don't need the Stripe Node SDK (which doesn't run
// cleanly in the Workers runtime without extra polyfills).
function formEncode(obj, prefix = '') {
  const params = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v && typeof v === 'object') {
          params.push(formEncode(v, `${paramKey}[${i}]`));
        } else {
          params.push(`${encodeURIComponent(`${paramKey}[${i}]`)}=${encodeURIComponent(v)}`);
        }
      });
    } else if (typeof value === 'object') {
      params.push(formEncode(value, paramKey));
    } else {
      params.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(value)}`);
    }
  }
  return params.filter(Boolean).join('&');
}

export async function createCheckoutSession(env, { items, orderId, customerEmail, successUrl, cancelUrl }) {
  const lineItems = items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.title },
      unit_amount: Math.round(item.price * 100) // Stripe wants cents
    },
    quantity: item.quantity
  }));

  const body = {
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    shipping_address_collection: { allowed_countries: ['US'] },
    metadata: { order_id: orderId },
    ...(customerEmail ? { customer_email: customerEmail } : {})
  };

  const res = await fetch(`${STRIPE_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formEncode(body)
  });

  if (!res.ok) throw new Error(`Stripe session creation failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function retrieveSession(env, sessionId) {
  const res = await fetch(
    `${STRIPE_BASE}/checkout/sessions/${sessionId}?expand[]=customer_details`,
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
  );
  if (!res.ok) throw new Error(`Stripe session retrieve failed: ${res.status} ${await res.text()}`);
  return res.json();
}

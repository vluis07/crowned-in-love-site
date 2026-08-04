import { createCheckoutSession } from '../lib/stripe.js';

export async function onRequestPost({ request, env }) {
  try {
    const { items, email } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400 });
    }
    for (const item of items) {
      if (!item.product_id || !item.variant_id || !item.title || !item.price || !item.quantity) {
        return new Response(JSON.stringify({ error: 'Cart item missing required fields' }), { status: 400 });
      }
    }

    const orderId = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO orders (id, cart_json, status, created_at) VALUES (?, ?, 'pending', ?)`
    ).bind(orderId, JSON.stringify(items), Date.now()).run();

    const session = await createCheckoutSession(env, {
      items,
      orderId,
      customerEmail: email,
      successUrl: `${env.SITE_URL}/success.html?order_id=${orderId}`,
      cancelUrl: `${env.SITE_URL}/cart.html`
    });

    return Response.json({ url: session.url });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

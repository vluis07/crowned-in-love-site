import { verifyStripeSignature } from '../lib/stripe-verify.js';
import { retrieveSession } from '../lib/stripe.js';
import { createOrder } from '../lib/printify.js';

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');

  const valid = await verifyStripeSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(payload);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    if (!orderId) return new Response('Missing order_id in session metadata', { status: 400 });

    const row = await env.DB.prepare('SELECT cart_json FROM orders WHERE id = ?').bind(orderId).first();
    if (!row) return new Response('Order not found', { status: 404 });

    try {
      const cart = JSON.parse(row.cart_json);
      const full = await retrieveSession(env, session.id);
      const shipping = full.shipping_details || full.customer_details;
      const nameParts = (shipping?.name || 'Customer').trim().split(' ');
      const firstName = nameParts.shift() || 'Customer';
      const lastName = nameParts.join(' ') || '-';
      const addr = shipping?.address || {};

      const addressTo = {
        first_name: firstName,
        last_name: lastName,
        email: full.customer_details?.email || '',
        phone: full.customer_details?.phone || '0000000000',
        country: addr.country || 'US',
        region: addr.state || '',
        address1: addr.line1 || '',
        address2: addr.line2 || '',
        city: addr.city || '',
        zip: addr.postal_code || ''
      };

      const lineItems = cart.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity
      }));

      const printifyOrder = await createOrder(env, { externalId: orderId, lineItems, addressTo });

      await env.DB.prepare(
        `UPDATE orders SET status = 'submitted', printify_order_id = ?, customer_email = ? WHERE id = ?`
      ).bind(printifyOrder.id, addressTo.email, orderId).run();
    } catch (err) {
      // Payment already succeeded — don't lose the order. Mark it failed so you can
      // find and manually submit it in Printify, and return 200 so Stripe stops retrying.
      await env.DB.prepare(
        `UPDATE orders SET status = 'failed', error = ? WHERE id = ?`
      ).bind(String(err.message).slice(0, 500), orderId).run();
    }
  }

  return new Response('ok', { status: 200 });
}

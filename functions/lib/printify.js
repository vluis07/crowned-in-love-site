const BASE = 'https://api.printify.com/v1';

export async function getProducts(env) {
  const res = await fetch(`${BASE}/shops/${env.PRINTIFY_SHOP_ID}/products.json`, {
    headers: { Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Printify products fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getProduct(env, productId) {
  const res = await fetch(`${BASE}/shops/${env.PRINTIFY_SHOP_ID}/products/${productId}.json`, {
    headers: { Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Printify product fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// lineItems: [{ product_id, variant_id, quantity }]
// addressTo: { first_name, last_name, email, phone, country, region, address1, address2, city, zip }
export async function createOrder(env, { externalId, lineItems, addressTo }) {
  const res = await fetch(`${BASE}/shops/${env.PRINTIFY_SHOP_ID}/orders.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: externalId,
      line_items: lineItems,
      shipping_method: 1, // standard shipping — change per your Printify shop's available methods
      send_shipping_notification: true,
      address_to: addressTo
    })
  });
  if (!res.ok) {
    throw new Error(`Printify order creation failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

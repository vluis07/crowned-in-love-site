import { getProducts } from '../lib/printify.js';

export async function onRequestGet({ env }) {
  try {
    const cached = await env.PRODUCTS_CACHE.get('published_products', 'json');
    if (cached) return Response.json(cached);

    const data = await getProducts(env);
    const published = (data.data || []).filter(p => p.visible);

    await env.PRODUCTS_CACHE.put('published_products', JSON.stringify(published), {
      expirationTtl: 3600 // 1 hour — adjust to taste, or purge manually after editing Printify
    });

    return Response.json(published);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

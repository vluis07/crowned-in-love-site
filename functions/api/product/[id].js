import { getProduct } from '../../lib/printify.js';

export async function onRequestGet({ env, params }) {
  try {
    const product = await getProduct(env, params.id);
    return Response.json(product);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

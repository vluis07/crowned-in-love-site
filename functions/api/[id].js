export async function onRequestGet({ env, params }) {
  const row = await env.DB.prepare(
    'SELECT status, printify_order_id, error FROM orders WHERE id = ?'
  ).bind(params.id).first();

  if (!row) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }
  return Response.json(row);
}

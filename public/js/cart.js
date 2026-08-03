const CART_KEY = 'cil_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

// item: { product_id, variant_id, title, price, image, variant_label, quantity }
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(
    i => i.product_id === item.product_id && i.variant_id === item.variant_id
  );
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

function updateQuantity(product_id, variant_id, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter(i => !(i.product_id === product_id && i.variant_id === variant_id));
  } else {
    const item = cart.find(i => i.product_id === product_id && i.variant_id === variant_id);
    if (item) item.quantity = quantity;
  }
  saveCart(cart);
  return cart;
}

function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function cartCount(cart) {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

function updateCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  if (badge) badge.textContent = cartCount(getCart());
}

document.addEventListener('DOMContentLoaded', updateCartBadge);

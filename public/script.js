"use strict";

const CART_KEY = "jfs_cart";
const $ = (selector) => document.querySelector(selector);

let currentUser = null;
let products = [];
let cart = [];

const money = (value) =>
  "₱" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }

  return data;
}

function showToast(message) {
  let toast = $("#toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.hidden = false;
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    cart = Array.isArray(saved) ? saved : [];
  } catch {
    cart = [];
  }

  updateCartCount();
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce(
    (total, item) => total + Math.max(0, Number(item.quantity) || 0),
    0
  );

  const element = $("#cartCount");
  if (element) element.textContent = count;
}

async function checkLoginStatus() {
  try {
    const data = await apiRequest("/api/auth/me");
    currentUser = data.user || null;
  } catch {
    currentUser = null;
  }

  updateAccountButton();
  return currentUser;
}

function updateAccountButton() {
  const button = $("#accountButton");
  if (!button) return;

  button.textContent = currentUser ? "♙ Log out" : "♙ Log in";
}

async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
    currentUser = null;
    updateAccountButton();
    window.location.replace("/login.html");
  } catch (error) {
    showToast(error.message);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}
// PRODUCTS
async function loadProducts() {
  const grid = $("#productGrid");
  if (!grid) return;

  grid.innerHTML = "<p>Loading products...</p>";

  try {
    const data = await apiRequest("/api/products");
    products = Array.isArray(data.products) ? data.products : [];
    renderProducts(products);
  } catch (error) {
    grid.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = error.message || "Unable to load products.";
    grid.appendChild(p);
  }
}

function renderProducts(list) {
  const grid = $("#productGrid");
  if (!grid) return;

  grid.replaceChildren();

  if (!list.length) {
    grid.innerHTML = "<p>No products found in this category.</p>";
    return;
  }

  list.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";

    const image = document.createElement("img");
    image.className = "product-image";
    image.src = product.image_url || "";
    image.alt = product.name || "Product";
    image.loading = "lazy";

    image.onerror = () => {
      image.style.display = "none";
    };

    const info = document.createElement("div");
    info.className = "product-info";

    const title = document.createElement("h3");
    title.textContent = product.name || "Product";

    const description = document.createElement("p");
    description.textContent = product.description || "";

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = money(product.price);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-to-cart";
    button.dataset.action = "add";
    button.dataset.id = product.id;
    button.textContent = Number(product.stock) > 0
      ? "Add to Cart"
      : "Out of Stock";
    button.disabled = Number(product.stock) <= 0;

    info.append(title, description, price, button);
    card.append(image, info);
    grid.appendChild(card);
  });
}

// CATEGORY FILTER
function filterProducts(category = "all") {
  const selected = String(category).trim().toLowerCase();

  const filtered = products.filter(product => {
    if (selected === "all") return true;

    const actual = String(product.category || "").trim().toLowerCase();
    return actual === selected;
  });

  renderProducts(filtered);
}

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-category]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    filterProducts(button.dataset.category || "all");
  });
});

// SEARCH
const searchInput = $("#searchInput");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = products.filter(product => {
      const text = [
        product.name,
        product.description,
        product.category
      ].join(" ").toLowerCase();

      return text.includes(query);
    });

    renderProducts(filtered);
  });
}

// ADD TO CART
function addToCart(productId) {
  const product = products.find(item =>
    String(item.id) === String(productId)
  );

  if (!product) {
    showToast("Product not found.");
    return;
  }

  if (Number(product.stock) <= 0) {
    showToast("This product is out of stock.");
    return;
  }

  const existing = cart.find(item =>
    String(item.product_id) === String(product.id)
  );

  if (existing) {
    if (Number(existing.quantity) >= Number(product.stock)) {
      showToast("You have reached the available stock.");
      return;
    }

    existing.quantity += 1;
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url || "",
      quantity: 1
    });
  }

  saveCart();
  showToast("Added to cart!");
}

 // CART DISPLAY
function openCart() {
  const oldModal = document.querySelector("#storeCartModal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "storeCartModal";
  modal.style.cssText = `
    position:fixed; inset:0; background:#0009; z-index:9999;
    display:flex; align-items:center; justify-content:center;
    padding:16px; overflow:auto;
  `;

  const panel = document.createElement("div");
  panel.style.cssText = `
    background:white; color:#222; width:100%; max-width:520px;
    max-height:90vh; overflow:auto; border-radius:14px;
    padding:20px; box-sizing:border-box;
  `;

  let total = 0;
  const rows = cart.map(item => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    total += price * quantity;

    return `
      <div style="display:flex;justify-content:space-between;gap:10px;
                  border-bottom:1px solid #ddd;padding:12px 0">
        <div>
          <strong>${escapeHTML(item.name)}</strong><br>
          ₱${price.toFixed(2)} × ${quantity}
        </div>
        <div style="text-align:right">
          <strong>₱${(price * quantity).toFixed(2)}</strong><br>
          <button data-cart-action="minus"
                  data-id="${escapeHTML(item.product_id)}">−</button>
          <button data-cart-action="plus"
                  data-id="${escapeHTML(item.product_id)}">+</button>
          <button data-cart-action="remove"
                  data-id="${escapeHTML(item.product_id)}">Remove</button>
        </div>
      </div>`;
  }).join("");

  panel.innerHTML = `
    <h2 style="margin-top:0">🛒 My Cart</h2>
    ${rows || "<p>Your cart is empty.</p>"}
    <h3>Total: ₱${total.toFixed(2)}</h3>
    <button id="checkoutButton" style="padding:12px;width:100%">
      Proceed to Checkout
    </button>
    <button id="closeStoreCart" style="padding:10px;width:100%;margin-top:8px">
      Continue Shopping
    </button>
  `;

  modal.appendChild(panel);
  document.body.appendChild(modal);

  modal.addEventListener("click", event => {
    if (event.target === modal) modal.remove();

    const button = event.target.closest("[data-cart-action]");
    if (!button) return;

    const item = cart.find(product =>
      String(product.product_id) === String(button.dataset.id)
    );
    if (!item) return;

    if (button.dataset.cartAction === "plus") {
      const product = products.find(p =>
        String(p.id) === String(item.product_id)
      );

      if (product && item.quantity < Number(product.stock)) {
        item.quantity++;
      } else {
        showToast("Available stock limit reached.");
      }
    }

    if (button.dataset.cartAction === "minus") {
      item.quantity--;
      if (item.quantity <= 0) {
        cart = cart.filter(p =>
          String(p.product_id) !== String(item.product_id)
        );
      }
    }

    if (button.dataset.cartAction === "remove") {
      cart = cart.filter(p =>
        String(p.product_id) !== String(item.product_id)
      );
    }

    saveCart();
    modal.remove();
    openCart();
  });

  $("#closeStoreCart").onclick = () => modal.remove();

  $("#checkoutButton").onclick = async () => {
    if (!cart.length) {
      showToast("Your cart is empty.");
      return;
    }

    try {
      await checkLoginStatus();

      if (!currentUser) {
        window.location.href = "/login.html";
        return;
      }

      window.location.href = "/checkout.html";
    } catch (error) {
      showToast(error.message);
    }
  };
}

// ORDER HISTORY
async function showOrders() {
  const section = $("#ordersSection");

  try {
    const data = await apiRequest("/api/orders");

    if (section) {
      section.hidden = false;
      section.innerHTML = "<h2>My Orders</h2>";
    }

    const orders = Array.isArray(data.orders) ? data.orders : [];

    if (!orders.length) {
      if (section) {
        section.innerHTML += "<p>You have no orders yet.</p>";
        section.scrollIntoView({ behavior: "smooth" });
      } else {
        showToast("You have no orders yet.");
      }
      return;
    }

    const list = section || document.createElement("section");
    if (!section) {
      list.id = "ordersSection";
      document.querySelector("main")?.appendChild(list);
      list.innerHTML = "<h2>My Orders</h2>";
    }

    orders.forEach(order => {
      const card = document.createElement("article");
      card.style.cssText =
        "border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0";

      const title = document.createElement("h3");
      title.textContent = `Order #${order.id}`;

      const details = document.createElement("p");
      details.textContent =
        `Total: ${money(order.total_amount)} | ` +
        `Payment: ${order.payment_method || "N/A"} | ` +
        `Status: ${order.order_status || "Pending"}`;

      card.append(title, details);
      list.appendChild(card);
    });

    list.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    if (error.message.toLowerCase().includes("unauthorized") ||
        error.message.toLowerCase().includes("login")) {
      window.location.href = "/login.html";
      return;
    }

    showToast(error.message || "Unable to load orders.");
  }
}

// BUTTON ACTIONS
document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "add") {
    addToCart(button.dataset.id);
  } else if (action === "cart") {
    openCart();
  } else if (action === "account") {
    if (currentUser) {
      logout();
    } else {
      window.location.href = "/login.html";
    }
  } else if (action === "my-orders") {
    showOrders();
  }
});

// CART BUTTON
const cartToggle = $("#cartToggle");
if (cartToggle) {
  cartToggle.addEventListener("click", openCart);
}

// INITIALIZE
async function initializeStore() {
  loadCart();

  const user = await checkLoginStatus();

  if (!user) {
    window.location.replace("/login.html");
    return;
  }

  await loadProducts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeStore);
} else {
  initializeStore();
}

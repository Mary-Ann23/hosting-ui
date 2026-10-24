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

function openCart() {
  const oldModal = document.querySelector("#storeCartModal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "storeCartModal";
  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(28,20,44,.65);
    z-index:9999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
    overflow-y:auto;
    backdrop-filter:blur(4px);
  `;

  const panel = document.createElement("div");
  panel.style.cssText = `
    background:linear-gradient(180deg,#fff,#faf7ff);
    color:#282238;
    width:100%;
    max-width:490px;
    max-height:90vh;
    overflow:auto;
    border-radius:22px;
    padding:23px;
    box-sizing:border-box;
    border:1px solid #ece7f4;
    box-shadow:0 20px 70px rgba(45,25,85,.25);
  `;

  let total = 0;

  const rows = cart.map(item => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    total += price * quantity;

    return `
      <div style="
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:10px;
        align-items:center;
        padding:14px;
        margin:12px 0;
        border:1px solid #ece7f4;
        border-radius:15px;
        background:#fff;
      ">
        <div style="min-width:0;overflow-wrap:anywhere">
          <strong style="color:#5634a5;font-size:14px">
            ${escapeHTML(item.name)}
          </strong>

          <p style="margin:6px 0;color:#777184;font-size:12px">
            ₱${price.toFixed(2)} each
          </p>

          <div style="
            display:flex;
            align-items:center;
            flex-wrap:wrap;
            gap:10px;
            margin-top:10px;
          ">
            <button
              data-cart-action="minus"
              data-id="${escapeHTML(item.product_id)}"
              style="
                width:34px;height:34px;
                border:1px solid #e5dafb;
                border-radius:10px;
                background:#f1ebff;
                color:#5634a5;
                font-size:20px;
                font-weight:bold;
              ">−</button>

            <strong>${quantity}</strong>

            <button
              data-cart-action="plus"
              data-id="${escapeHTML(item.product_id)}"
              style="
                width:34px;height:34px;
                border:1px solid #e5dafb;
                border-radius:10px;
                background:#f1ebff;
                color:#5634a5;
                font-size:20px;
                font-weight:bold;
              ">+</button>

            <button
              data-cart-action="remove"
              data-id="${escapeHTML(item.product_id)}"
              style="
                border:0;
                border-radius:9px;
                padding:8px;
                background:#ffecf4;
                color:#a33a55;
                font-weight:bold;
              ">Remove</button>
          </div>
        </div>

        <strong style="color:#5634a5;white-space:nowrap">
          ₱${(price * quantity).toFixed(2)}
        </strong>
      </div>
    `;
  }).join("");

  panel.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-bottom:18px;
    ">
      <div>
        <h2 style="margin:0;color:#5634a5">
          🛒 My Cart
        </h2>
        <p style="margin:6px 0 0;color:#777184;font-size:13px">
          Your grocery selections
        </p>
      </div>

      <button
        id="closeStoreCart"
        aria-label="Close cart"
        style="
          width:38px;height:38px;
          border:0;
          border-radius:50%;
          background:#f1ebff;
          color:#5634a5;
          font-size:23px;
        ">×</button>
    </div>

    ${rows || `
      <div style="
        padding:25px 12px;
        text-align:center;
        background:#f8f4ff;
        border-radius:15px;
        color:#777184;
      ">
        <div style="font-size:42px">🛍️</div>
        <h3 style="color:#5634a5">Your cart is empty</h3>
        <p>Add some products to get started!</p>
      </div>
    `}
  `;
    panel.innerHTML += `
    <div style="
      margin-top:16px;
      padding:18px;
      border-radius:16px;
      background:#f1ebff;
      border:1px solid #e5dafb;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
      ">
        <span style="color:#655a79">Total Amount</span>
        <strong style="font-size:22px;color:#5634a5">
          ₱${total.toFixed(2)}
        </strong>
      </div>
    </div>

    <button
      id="storeCartCheckout"
      style="
        width:100%;
        margin-top:15px;
        padding:15px;
        border:0;
        border-radius:13px;
        background:linear-gradient(135deg,#7546cf,#5634a5);
        color:white;
        font-size:15px;
        font-weight:bold;
        box-shadow:0 5px 14px rgba(86,52,165,.22);
      ">
      Proceed to Checkout →
    </button>

    <button
      id="continueShopping"
      style="
        width:100%;
        margin-top:10px;
        padding:13px;
        border:1px solid #e5dafb;
        border-radius:13px;
        background:white;
        color:#5634a5;
        font-weight:bold;
      ">
      Continue Shopping
    </button>
  `;

  modal.appendChild(panel);
  document.body.appendChild(modal);

  const closeCartModal = () => modal.remove();

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeCartModal();
      return;
    }

    const button = event.target.closest("[data-cart-action]");
    if (!button) return;

    const id = String(button.dataset.id);
    const action = button.dataset.cartAction;

    const item = cart.find(
      product => String(product.product_id) === id
    );

    if (!item) return;

    if (action === "plus") {
      const product = products.find(
        product => String(product.id) === id
      );

      const stock = Number(product?.stock ?? 0);

      if (item.quantity >= stock) {
        alert("Sorry, maximum available stock reached.");
        return;
      }

      item.quantity += 1;
    } else if (action === "minus") {
      item.quantity -= 1;

      if (item.quantity <= 0) {
        cart = cart.filter(
          product => String(product.product_id) !== id
        );
      }
    } else if (action === "remove") {
      cart = cart.filter(
        product => String(product.product_id) !== id
      );
    }

    saveCart();
    closeCartModal();
    openCart();
  });

  panel.querySelector("#closeStoreCart")
    .addEventListener("click", closeCartModal);

  panel.querySelector("#continueShopping")
    .addEventListener("click", closeCartModal);

  panel.querySelector("#storeCartCheckout")
    .addEventListener("click", async () => {
      if (!cart.length) {
        alert("Your cart is empty. Please add products first.");
        return;
      }

      try {
        const loggedIn = await checkLoginStatus();

        if (!loggedIn) {
          window.location.href = "/login.html";
          return;
        }

        window.location.href = "/checkout.html";
      } catch (error) {
        console.error("Checkout error:", error);
        alert("Unable to verify your login. Please try again.");
      }
    });
}

      
async function showOrders() {
  const section = $("#ordersSection");
  const list = $("#ordersList");

  if (!section || !list) {
    showToast("My Orders section not found.");
    return;
  }

  section.classList.remove("hidden");
  section.hidden = false;
  list.innerHTML = "<p>Loading your orders...</p>";

  section.scrollIntoView({ behavior: "smooth" });

  try {
    const data = await apiRequest("/api/orders");
    const orders = Array.isArray(data.orders) ? data.orders : [];

    list.replaceChildren();

    if (!orders.length) {
      list.innerHTML = "<p>You have no orders yet.</p>";
      return;
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
  } catch (error) {
    list.replaceChildren();

    const message = document.createElement("p");
    message.textContent = error.message || "Unable to load orders.";
    list.appendChild(message);

    if (/unauthorized|login/i.test(error.message)) {
      window.location.href = "/login.html";
    }
  }
}

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

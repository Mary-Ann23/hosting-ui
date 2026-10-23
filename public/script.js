
"use strict";

const $ = (selector) => document.querySelector(selector);

const productGrid = $("#productGrid");
const productCount = $("#productCount");
const searchInput = $("#searchInput");
const searchForm = $("#searchForm");
const modalBackdrop = $("#modalBackdrop");
const modalContent = $("#modalContent");
const modalTitle = $("#modalTitle");
const toastElement = $("#toast");

let products = [];
let currentCategory = "All";
let currentSearch = "";
let currentUser = null;
let cart = loadCart();
let toastTimer = null;

const CART_KEY = "jfs_cart";

function escapeHTML(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => replacements[character]
  );
}

function money(value) {
  return "₱" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed (${response.status}).`
    );
  }

  return data;
}

function showToast(message) {
  if (!toastElement) {
    alert(message);
    return;
  }

  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 3000);
}

function openModal(title, content) {
  if (!modalBackdrop || !modalContent || !modalTitle) {
    alert("The modal elements are missing from index.html.");
    return;
  }

  modalTitle.textContent = title;
  modalContent.innerHTML = content;
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  if (modalBackdrop) {
    modalBackdrop.classList.add("hidden");
  }
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const countElement = $("#cartCount");

  if (countElement) {
    countElement.textContent = cart.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }
}

function updateAccountButton() {
  const button = $("#accountButton");

  if (button) {
    button.textContent = currentUser
      ? "♙ Log out"
      : "♙ Log in";
  }
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

async function loadProducts() {
  const grid = document.querySelector("#productGrid");
  const count = document.querySelector("#productCount");

  if (!grid) {
    console.error("Product grid not found!");
    return;
  }

  grid.innerHTML = "<p>Connecting to products...</p>";

  try {
    const response = await fetch("/api/products", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.products)) {
      throw new Error("Invalid products response.");
    }

    products = data.products;

    console.log("Products loaded:", products.length);

    renderProducts();

    if (count) {
      count.textContent = `${products.length} products`;
    }
  } catch (error) {
    console.error("Product loading failed:", error);

    grid.innerHTML = `
      <div class="empty-state">
        <p>Unable to load products.</p>
        <p>${escapeHTML(error.message)}</p>
        <button type="button" data-action="retry-products">
          Try Again
        </button>
      </div>
    `;

    if (count) {
      count.textContent = "Products unavailable";
    }
  }
      }


function categoryMatches(product) {
  const category = String(product.category || "")
    .trim()
    .toLowerCase();

  if (currentCategory === "All") {
    return true;
  }

  const categoryAliases = {
    "Fresh Produce": ["fresh produce", "produce", "fruits", "vegetables"],
    "Groceries": ["groceries", "grocery"],
    "Beverages": ["beverages", "drinks", "drink"],
    "Snacks": ["snacks", "snack"],
    "Household Needs": ["household needs", "household"]
  };

  const accepted = categoryAliases[currentCategory] || [
    currentCategory.toLowerCase()
  ];

  return accepted.includes(category);
}

function getFilteredProducts() {
  return products.filter((product) => {
    const matchesCategory = categoryMatches(product);

    const searchText = [
      product.name,
      product.description,
      product.category
    ].join(" ").toLowerCase();

    const matchesSearch = searchText.includes(
      currentSearch.toLowerCase()
    );

    return matchesCategory && matchesSearch;
  });
}


function renderCart() {
  const items = getCartItems();

  const content = items.length
    ? `
      <div class="cart-items">
        ${items.map((item) => `
          <div class="cart-item">
            <div class="cart-product-info">
              <strong>${escapeHTML(item.name)}</strong>
              <p>${money(item.price)} each</p>
            </div>

            <strong class="cart-item-price">
              ${money(Number(item.price) * item.quantity)}
            </strong>

            <div class="quantity-controls">
              <button
                type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.id)}"
                data-change="-1"
                aria-label="Decrease quantity"
              >−</button>

              <span>${item.quantity}</span>

              <button
                type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.id)}"
                data-change="1"
                aria-label="Increase quantity"
              >+</button>
            </div>
          </div>
        `).join("")}
      </div>
    `
    : `<p>Your cart is empty.</p>`;

  openModal("My Cart", content);
}
function addToCart(productId) {
  const product = products.find(
    (item) => String(item.id) === String(productId)
  );

  if (!product) {
    showToast("Product not found.");
    return;
  }

  const stock = Number(product.stock || 0);

  if (stock <= 0) {
    showToast("This product is out of stock.");
    return;
  }

  const existing = cart.find(
    (item) => String(item.productId) === String(product.id)
  );

  if (existing) {
    if (existing.quantity >= stock) {
      showToast("You have reached the available stock.");
      return;
    }

    existing.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      quantity: 1
    });
  }

  saveCart();
  showToast(`${product.name} added to cart.`);
}


function getCartItems() {
  return cart.map((item) => {
    const product = products.find(
      (entry) => String(entry.id) === String(item.productId)
    );

    return product
      ? {
          ...product,
          quantity: Number(item.quantity || 1)
        }
      : null;
  }).filter(Boolean);
}

function changeQuantity(productId, change) {
  const item = cart.find(
    (entry) => String(entry.productId) === String(productId)
  );

  if (!item) return;

  const product = products.find(
    (entry) => String(entry.id) === String(productId)
  );

  const maxStock = Number(product?.stock || 0);
  const newQuantity = item.quantity + change;

  if (newQuantity <= 0) {
    cart = cart.filter(
      (entry) => String(entry.productId) !== String(productId)
    );
  } else if (newQuantity <= maxStock) {
    item.quantity = newQuantity;
  } else {
    showToast("You have reached the available stock.");
  }

  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

function renderCart() {
  const items = getCartItems();

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const content = items.length
    ? `
      
<div class="cart-item">
  <div class="cart-product-info">
    <strong>${escapeHTML(item.name)}</strong>
    <p>${money(item.price)} each</p>
  </div>

  <strong class="cart-item-price">
    ${money(Number(item.price) * item.quantity)}
  </strong>

  <div class="quantity-controls">
    <button
      type="button"
      data-action="quantity"
      data-id="${escapeHTML(item.id)}"
      data-change="-1"
      aria-label="Decrease quantity"
    >−</button>

    <span>${item.quantity}</span>

    <button
      type="button"
      data-action="quantity"
      data-id="${escapeHTML(item.id)}"
      data-change="1"
      aria-label="Increase quantity"
    >+</button>
  </div>
</div>


            <div class="quantity-controls">
              <button
                type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.id)}"
                data-change="-1"
                aria-label="Decrease quantity"
              >−</button>

              <span>${item.quantity}</span>

              <button
                type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.id)}"
                data-change="1"
                aria-label="Increase quantity"
              >+</button>
            </div>

            <strong>${money(Number(item.price) * item.quantity)}</strong>
          </div>
        `).join("")}
      </div>

      <hr>

      <h3>Total: ${money(total)}</h3>

      <button type="button" data-action="checkout">
        Proceed to Checkout
      </button>

      <button type="button" data-action="clear-cart">
        Clear Cart
      </button>
    `
    : `
      <div class="empty-state">
        <p>Your cart is empty.</p>
        <button type="button" data-action="close-modal">
          Continue Shopping
        </button>
      </div>
    `;

  openModal("My Cart", content);
}

function showAccount() {
  if (currentUser) {
    logout();
    return;
  }

  renderAuthForm("login");
}

function renderAuthForm(mode = "login") {
  const isRegister = mode === "register";

  openModal(
    isRegister ? "Create Account" : "Log in",
    `
      <div class="auth-tabs">
        <button
          type="button"
          data-action="auth-tab"
          data-mode="login"
          ${!isRegister ? 'class="active"' : ""}
        >Log in</button>

        <button
          type="button"
          data-action="auth-tab"
          data-mode="register"
          ${isRegister ? 'class="active"' : ""}
        >Create account</button>
      </div>

      <form id="authForm">
        <label for="authUsername">Username</label>
        <input
          id="authUsername"
          name="username"
          type="text"
          minlength="3"
          maxlength="30"
          autocomplete="username"
          required
        >

        <label for="authPassword">Password</label>
        <div class="password-field">
          <input
            id="authPassword"
            name="password"
            type="password"
            minlength="8"
            maxlength="72"
            autocomplete="${isRegister ? "new-password" : "current-password"}"
            required
          >
          <button type="button" data-action="toggle-password">
            Show
          </button>
        </div>

        <button type="submit" ${isRegister ? 'data-mode="register"' : 'data-mode="login"'}>
          ${isRegister ? "Create Account" : "Log in"}
        </button>

        <p id="authMessage" role="status"></p>
      </form>
    `
  );
}

async function submitAuth(event) {
  event.preventDefault();

  const form = event.target;
  if (form.id !== "authForm") return;

  const username = form.username.value.trim();
  const password = form.password.value;
  const submitButton = form.querySelector('button[type="submit"]');
  const message = $("#authMessage");
  const mode = submitButton?.dataset.mode || "login";

  if (submitButton) submitButton.disabled = true;
  if (message) message.textContent = "Please wait...";

  try {
    const endpoint = mode === "register"ñ
      ? "/api/auth/register"
      : "/api/auth/login";

    const data = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    if (mode === "register") {
      renderAuthForm("login");
      const authMessage = $("#authMessage");

      if (authMessage) {
        authMessage.textContent =
          data.message || "Account created. Please log in.";
      }

      return;
    }

    currentUser = data.user || null;
    updateAccountButton();
    closeModal();

    showToast("Login successful!");
    await loadProducts();
  } catch (error) {
    if (message) {
      message.textContent = error.message;
    } else {
      showToast(error.message);
    }
  } finally {
    const currentButton = $("#authForm button[type='submit']");
    if (currentButton) currentButton.disabled = false;
  }
}

async function logout() {
  try {
    await apiRequest("/api/auth/logout", {
      method: "POST"
    });

    currentUser = null;
    updateAccountButton();
    closeModal();

    showToast("You have logged out.");

    // The home page requires login. Return to the login page.
    window.location.href = "/login.html";
  } catch (error) {
    showToast(error.message);
  }
}




function showCheckout() {
  if (!currentUser) {
    openModal("Log in Required", `
      <div class="checkout-message">
        <p>Please log in before checking out.</p>
        <button type="button" data-action="auth-tab" data-mode="login">
          Log in
        </button>
      </div>
    `);
    return;
  }

  const items = getCartItems();

  if (!items.length) {
    showToast("Your cart is empty.");
    return;
  }

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const itemCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  openModal("💜 Checkout", `
    <div class="checkout-page">
      <p class="checkout-subtitle">
        Complete your order and enjoy your favorite food!
      </p>

      <div class="checkout-layout">
        <form id="checkoutForm" class="checkout-form">

          <section class="checkout-section">
            <h3>
              <span class="checkout-step">1</span>
              Delivery Information
            </h3>
            <p class="checkout-hint">
              Please provide your delivery details.
            </p>

            <label for="checkoutName">Full Name</label>
            <input
              id="checkoutName"
              name="full_name"
              type="text"
              placeholder="Enter your full name"
              autocomplete="name"
              required
            >

            <label for="checkoutPhone">Phone Number</label>
            <input
              id="checkoutPhone"
              name="contact_number"
              type="tel"
              placeholder="09XX XXX XXXX"
              autocomplete="tel"
              required
            >

            <label for="checkoutAddress">Delivery Address</label>
            <textarea
              id="checkoutAddress"
              name="address"
              placeholder="House No., Street, Barangay, City"
              autocomplete="street-address"
              required
              rows="2"
            ></textarea>

            <label for="checkoutInstructions">
              Delivery Notes (Optional)
            </label>
            <textarea
              id="checkoutInstructions"
              name="instructions"
              placeholder="Landmark or special instructions"
              rows="2"
            ></textarea>
          </section>

          <section class="checkout-section">
            <h3>
              <span class="checkout-step">2</span>
              Payment Method
            </h3>
            <p class="checkout-hint">
              Choose your preferred payment option.
            </p>

            <div class="checkout-payment-options">
              <label class="checkout-payment-card">
                <input
                  type="radio"
                  name="payment_method"
                  value="COD"
                  checked
                >
                <span class="checkout-payment-icon">💵</span>
                <span>
                  <strong>Cash on Delivery</strong>
                  <small>Pay when your order arrives.</small>
                </span>
              </label>

              <label class="checkout-payment-card">
                <input
                  type="radio"
                  name="payment_method"
                  value="MAYA"
                >
                <span class="checkout-payment-icon">💳</span>
                <span>
                  <strong>Maya</strong>
                  <small>Pay securely through Maya.</small>
                </span>
              </label>
            </div>
          </section>

          <div class="checkout-secure">
            🔒 <span>
              <strong>Safe and secure checkout</strong>
              <small>Your order information is submitted securely.</small>
            </span>
          </div>

          <button class="checkout-place-order" type="submit">
            🔒 Place Order · ${money(subtotal)}
          </button>

          <p id="checkoutMessage" role="status"
             class="checkout-message"></p>
        </form>

        <aside class="checkout-summary">
          <h3>🛒 Order Summary</h3>
          <p class="checkout-item-count">
            ${itemCount} item${itemCount === 1 ? "" : "s"}
          </p>

          <div class="checkout-summary-items">
            ${items.map((item) => `
              <div class="checkout-summary-item">
                <div class="checkout-item-details">
                  <strong>${escapeHTML(item.name)}</strong>
                  <small>
                    ${item.quantity} × ${money(item.price)}
                  </small>
                </div>
                <strong>
                  ${money(Number(item.price) * item.quantity)}
                </strong>
              </div>
            `).join("")}
          </div>

          <div class="checkout-total-row">
            <span>Subtotal</span>
            <strong>${money(subtotal)}</strong>
          </div>

          <div class="checkout-total-row checkout-grand-total">
            <span>Total</span>
            <strong>${money(subtotal)}</strong>
          </div>

          <p class="checkout-summary-note">
            💜 Thank you for choosing JABIÑAR FOOD STORE!
          </p>
        </aside>
      </div>
    </div>
  `);
}
  

async function submitCheckout(event) {
  event.preventDefault();

  const form = event.target;
  if (form.id !== "checkoutForm") return;

  const items = getCartItems();

  if (!items.length) {
    showToast("Your cart is empty.");
    closeModal();
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const message = $("#checkoutMessage");

  if (submitButton) submitButton.disabled = true;
  if (message) message.textContent = "Processing your order...";

  const payload = {
    full_name: form.full_name.value.trim(),
    contact_number: form.contact_number.value.trim(),
    address: form.address.value.trim(),
    instructions: form.instructions.value.trim(),
    items: items.map((item) => ({
      product_id: item.id,
      quantity: item.quantity
    }))
  };

  try {
    const paymentMethod = form.payment_method.value;

    if (paymentMethod === "MAYA") {
      const data = await apiRequest("/api/checkout/maya", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (data.checkoutUrl) {
        // Keep the cart until payment/order status is confirmed.
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error("The server did not return a Maya checkout URL.");
    }

    const data = await apiRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    cart = [];
    saveCart();
    closeModal();

    showToast(
      data.message || "Order placed successfully! Payment: COD."
    );

    await showOrders();
  } catch (error) {
    if (message) {
      message.textContent = error.message;
    } else {
      showToast(error.message);
    }
  } finally {
    const currentButton = $("#checkoutForm button[type='submit']");
    if (currentButton) currentButton.disabled = false;
  }
}

async function showOrders() {
  closeModal();

  const section = $("#ordersSection");
  const list = $("#ordersList");

  if (!section || !list) {
    showToast("The orders section is missing from index.html.");
    return;
  }

  if (!currentUser) {
    renderAuthForm("login");
    return;
  }

  section.classList.remove("hidden");
  list.innerHTML = "<p>Loading your orders...</p>";

  try {
    const data = await apiRequest("/api/orders");
    const orders = Array.isArray(data.orders) ? data.orders : [];

    if (!orders.length) {
      list.innerHTML = "<p>You have no orders yet.</p>";
      return;
    }

    list.innerHTML = orders.map((order) => {
      let orderItems = order.items || [];

      if (typeof orderItems === "string") {
        try {
          orderItems = JSON.parse(orderItems);
        } catch {
          orderItems = [];
        }
      }

      const itemMarkup = Array.isArray(orderItems)
        ? orderItems.map((item) => `
            <li>
              ${escapeHTML(item.name || item.product_name || "Product")}
              × ${Number(item.quantity || 1)}
            </li>
          `).join("")
        : "";

      return `
        <article class="order-card">
          <h3>Order #${escapeHTML(order.id)}</h3>
          <p>Status: ${escapeHTML(order.status || "Pending")}</p>
          <p>Payment: ${escapeHTML(order.payment_method || "COD")}</p>
          <p>Total: ${money(order.total_amount ?? order.total ?? 0)}</p>
          <ul>${itemMarkup}</ul>
        </article>
      `;
    }).join("");
  } catch (error) {
    list.innerHTML = `
      <p>Unable to load orders.</p>
      <p>${escapeHTML(error.message)}</p>
      <button type="button" data-action="my-orders">
        Try Again
      </button>
    `;
  }
}

function handleMayaReturn() {
  const params = new URLSearchParams(window.location.search);
  const hasMayaParams = [
    "payment",
    "status",
    "checkoutId",
    "checkout_id"
  ].some((key) => params.has(key));

  if (!hasMayaParams) return;

  // URL parameters alone do not prove that payment succeeded.
  showToast(
    "Returned from Maya. Please check My Orders for the latest order status."
  );

  history.replaceState({}, document.title, window.location.pathname);
}

document.addEventListener("click", async (event) => {
  const categoryButton = event.target.closest("[data-category]");

  if (categoryButton) {
    setCategory(categoryButton.dataset.category);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  switch (action) {
    case "account":
      await checkLoginStatus();

      if (currentUser) {
        await logout();
      } else {
        renderAuthForm("login");
      }
      break;

    case "cart":
      renderCart();
      break;

    case "my-orders":
      await showOrders();
      break;

    case "hide-orders": {
      const section = $("#ordersSection");
      if (section) section.classList.add("hidden");
      break;
    }

    case "add":
      addToCart(button.dataset.id);
      break;

    case "quantity":
      changeQuantity(
        button.dataset.id,
        Number(button.dataset.change)
      );
      break;

    case "clear-cart":
      clearCart();
      showToast("Cart cleared.");
      break;

    case "checkout":
      showCheckout();
      break;
         case "close-modal":
      closeModal();
      break;

    case "auth-tab":
      renderAuthForm(button.dataset.mode || "login");
      break;

    case "toggle-password": {
      const passwordInput = $("#authPassword");

      if (passwordInput) {
        const showing = passwordInput.type === "text";
        passwordInput.type = showing ? "password" : "text";
        button.textContent = showing ? "Show" : "Hide";
      }
      break;
    }

    case "clear-search":
      clearSearch();
      break;
        case "retry-products":
      await loadProducts();
      break;
  }
});

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    currentSearch = searchInput ? searchInput.value.trim() : "";
    renderProducts();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value.trim();
    renderProducts();
  });
}


document.addEventListener("submit", async (event) => {
  if (event.target.id === "authForm") {
    await submitAuth(event);
  }

  if (event.target.id === "checkoutForm") {
    await submitCheckout(event);
  }
});

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });
}
async function initializeStore() {
  console.log("1. initializeStore started");

  try {
    updateCartCount();
    console.log("2. Cart count updated");

    await checkLoginStatus();
    console.log("3. Login status checked");

    handleMayaReturn();
    console.log("4. Maya return handled");

    await loadProducts();
    console.log("5. Products loaded");
  } catch (error) {
    console.error("Store initialization error:", error);

    if (productGrid) {
      productGrid.innerHTML = `
        <p>Store error: ${escapeHTML(error.message)}</p>
        <button type="button" data-action="retry-products">
          Try Again
        </button>
      `;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeStore, {
    once: true
  });
} else {
  initializeStore();
}

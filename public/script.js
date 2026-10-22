
"use strict";

/* =========================================
   JABIÑAR FOOD STORE
   Corrected Frontend Script
========================================= */

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
let orders = [];
let toastTimer = null;
let cart = loadCart();

/* =========================================
   HELPERS
========================================= */

function money(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

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
    (char) => replacements[char]
  );
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? {
        "Content-Type": "application/json"
      } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed (${response.status}).`
    );
  }

  return data;
}

function showToast(message) {
  if (!toastElement) {
    console.log(message);
    return;
  }

  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 2800);
}

function openModal(title, html) {
  if (!modalBackdrop || !modalContent) {
    showToast("The popup is unavailable.");
    return;
  }

  if (modalTitle) {
    modalTitle.textContent = title;
  }

  modalContent.innerHTML = html;
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop?.classList.add("hidden");
}

function setAccountButton() {
  const button = $("#accountButton");

  if (!button) return;

  button.textContent = currentUser ? "♙ Log out" : "♙ Log in";

  button.setAttribute(
    "aria-label",
    currentUser ? "Log out" : "Log in"
  );
}

/* =========================================
   CART STORAGE
========================================= */

function loadCart() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("jfs_cart") || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved
      .filter((item) =>
        item &&
        item.productId != null &&
        Number.isInteger(Number(item.quantity)) &&
        Number(item.quantity) > 0
      )
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity)
      }));
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem("jfs_cart", JSON.stringify(cart));
  } catch {
    showToast("Cart storage is unavailable in this browser.");
  }
}

function getProduct(id) {
  return products.find(
    (product) => String(product.id) === String(id)
  );
}

function getCartDetails() {
  return cart.map((item) => {
    const product = getProduct(item.productId);

    if (!product) return null;

    return {
      ...item,
      product,
      subtotal: Number(product.price) * item.quantity
    };
  }).filter(Boolean);
}

function getCartTotal() {
  return getCartDetails().reduce(
    (total, item) => total + item.subtotal,
    0
  );
}

function updateCartCount() {
  const count = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const element = $("#cartCount");

  if (element) {
    element.textContent = String(count);
  }
}

/* =========================================
   PRODUCTS
========================================= */

function renderProducts() {
  if (!productGrid) return;

  const filtered = products.filter((product) => {
    const category = String(product.category || "");

    const matchesCategory =
      currentCategory === "All" ||
      category.toLowerCase() === currentCategory.toLowerCase();

    const searchText = [
      product.name,
      product.category,
      product.description
    ].join(" ").toLowerCase();

    const matchesSearch = searchText.includes(
      currentSearch.toLowerCase()
    );

    return matchesCategory && matchesSearch;
  });

  if (productCount) {
    productCount.textContent =
      `${filtered.length} ${
        filtered.length === 1 ? "product" : "products"
      }`;
  }

  if (filtered.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try another search or category.</p>
        <button
          type="button"
          class="secondary-button"
          data-action="clear-search">
          Show all products
        </button>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = filtered.map((product) => {
    const image = String(product.image_url || "");
    const available = Number(product.stock || 0) > 0;

    return `
      <article class="product-card">
        <div class="product-image">
          ${
            image
              ? `
                <img
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(product.name)}"
                  loading="lazy"
                  onerror="this.style.display='none'">
              `
              : `
                <div class="image-placeholder">
                  ${escapeHTML(product.name)}
                </div>
              `
          }

          <span class="product-category">
            ${escapeHTML(product.category || "Food")}
          </span>
        </div>

        <div class="product-info">
          <h3>${escapeHTML(product.name)}</h3>

          <p class="product-description">
            ${escapeHTML(
              product.description || "A delicious choice for you."
            )}
          </p>

          <div class="product-bottom">
            <strong class="product-price">
              ${money(product.price)}
            </strong>

            <button
              type="button"
              class="add-to-cart"
              data-action="add"
              data-id="${escapeHTML(product.id)}"
              ${available ? "" : "disabled"}>
              ${available ? "＋ Add" : "Out of stock"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function setCategory(category) {
  currentCategory = category || "All";

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.category.toLowerCase() ===
        currentCategory.toLowerCase()
    );
  });

  renderProducts();
}

async function loadProducts() {
  if (productGrid) {
    productGrid.innerHTML =
      '<p class="loading">Loading delicious finds...</p>';
  }

  try {
    const data = await apiRequest("/api/products");

    const list = Array.isArray(data)
      ? data
      : data.products;

    if (!Array.isArray(list)) {
      throw new Error("Invalid products response.");
    }

    products = list;

    renderProducts();
    updateCartCount();
  } catch (error) {
    console.error("Products loading error:", error);

    if (productGrid) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load products</h3>
          <p>${escapeHTML(error.message)}</p>
          <button
            class="primary-button"
            type="button"
            data-action="retry-products">
            Try Again
          </button>
          <button
            class="secondary-button"
            type="button"
            data-action="account">
            Log in
          </button>
        </div>
      `;
    }

    if (productCount) {
      productCount.textContent = "Unavailable";
    }
  }
}

/* =========================================
   CART ACTIONS
========================================= */

function addToCart(id) {
  const product = getProduct(id);

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
    (item) => String(item.productId) === String(id)
  );

  const nextQuantity = existing ? existing.quantity + 1 : 1;

  if (nextQuantity > stock) {
    showToast("Sorry, there is not enough stock available.");
    return;
  }

  if (existing) {
    existing.quantity = nextQuantity;
  } else {
    cart.push({
      productId: product.id,
      quantity: 1
    });
  }

  saveCart();
  updateCartCount();

  showToast(`${product.name} added to cart.`);
}

function changeQuantity(id, amount) {
  const item = cart.find(
    (entry) => String(entry.productId) === String(id)
  );

  const product = getProduct(id);

  if (!item || !product) return;

  const next = item.quantity + amount;

  if (next <= 0) {
    cart = cart.filter(
      (entry) => String(entry.productId) !== String(id)
    );
  } else if (next > Number(product.stock || 0)) {
    showToast("You have reached the available stock.");
    return;
  } else {
    item.quantity = next;
  }

  saveCart();
  updateCartCount();
  renderCart();
}

function renderCart() {
  const items = getCartDetails();

  const content = items.length
    ? `
      <div class="cart-items">
        ${items.map((item) => `
          <div class="cart-item">
            <div class="cart-item-info">
              <strong>${escapeHTML(item.product.name)}</strong>
              <p>${money(item.product.price)} each</p>
              <b>${money(item.subtotal)}</b>
            </div>

            <div class="quantity-controls">
              <button
                type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.productId)}"
                data-change="-1"
                aria-label="Decrease quantity">−</button>

              <span>${item.quantity}</span>

              <button
                type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.productId)}"
                data-change="1"
                aria-label="Increase quantity">+</button>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="cart-total">
        <span>Total</span>
        <strong>${money(getCartTotal())}</strong>
      </div>

      <button
        class="primary-button"
        type="button"
        data-action="checkout">
        Proceed to Checkout
      </button>

      <button
        class="secondary-button"
        type="button"
        data-action="clear-cart">
        Clear Cart
      </button>
    `
    : `
      <div class="empty-state">
        <h3>Your cart is empty</h3>
        <p>Add your favorite food to get started.</p>
        <button
          class="primary-button"
          type="button"
          data-action="close-modal">
          Continue Shopping
        </button>
      </div>
    `;

  openModal("Your Shopping Cart", content);
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartCount();
  renderCart();
  showToast("Your cart has been cleared.");
}

/* =========================================
   LOGIN AND REGISTRATION
========================================= */

function showAccount() {
  if (currentUser) {
    logout();
    return;
  }

  openModal("Log in", `
    <div class="auth-tabs">
      <button
        type="button"
        class="auth-tab active"
        data-action="auth-tab"
        data-tab="login">Log in</button>

      <button
        type="button"
        class="auth-tab"
        data-action="auth-tab"
        data-tab="register">Create account</button>
    </div>

    <div id="authFormContainer"></div>
  `);

  renderAuthForm("login");
}

function renderAuthForm(mode) {
  const container = $("#authFormContainer");

  if (!container) return;

  const registering = mode === "register";

  container.innerHTML = `
    <form id="authForm" class="store-form">
      ${
        registering
          ? `
            <label class="form-field">
              <span>Full name</span>
              <input
                name="full_name"
                type="text"
                maxlength="100"
                required
                autocomplete="name"
                placeholder="Enter your full name">
            </label>
          `
          : ""
      }

      <label class="form-field">
        <span>Username</span>
        <input
          name="username"
          type="text"
          minlength="3"
          maxlength="30"
          required
          autocomplete="username"
          placeholder="Enter your username">
      </label>

      <label class="form-field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          minlength="8"
          maxlength="72"
          required
          autocomplete="${registering ? "new-password" : "current-password"}"
          placeholder="${registering ? "At least 8 characters" : "Enter your password"}">
      </label>

      <button class="primary-button" type="submit">
        ${registering ? "Create Account" : "Log in"}
      </button>

      <p class="form-message" id="authMessage" role="status"></p>
    </form>
  `;

  document.querySelectorAll("[data-action='auth-tab']").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.tab === mode
    );
  });
}

async function submitAuth(form) {
  const message = $("#authMessage");
  const button = form.querySelector('[type="submit"]');
  const formData = new FormData(form);
  const isRegister = formData.has("full_name");

  const payload = {
    username: String(formData.get("username") || "").trim(),
    password: String(formData.get("password") || "")
  };

  if (isRegister) {
    payload.full_name =
      String(formData.get("full_name") || "").trim();
  }

  if (button) button.disabled = true;
  if (message) message.textContent = "Connecting to the server...";

  try {
    const data = await apiRequest(
      isRegister ? "/api/auth/register" : "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    if (isRegister) {
      renderAuthForm("login");

      const loginMessage = $("#authMessage");

      if (loginMessage) {
        loginMessage.textContent =
          "Account created successfully. You can now log in.";
      }

      showToast("Account created. Please log in.");
      return;
    }

    if (!data.user) {
      throw new Error("Login API did not return a user.");
    }

    currentUser = data.user;

    setAccountButton();
    closeModal();

    showToast("Welcome to JABIÑAR FOOD STORE!");

    await loadProducts();
    handleMayaReturn();
  } catch (error) {
    if (message) {
      message.textContent = error.message;
    } else {
      showToast(error.message);
    }
  } finally {
    if (button) button.disabled = false;
  }
}

async function logout() {
  try {
    await apiRequest("/api/auth/logout", {
      method: "POST"
    });
  } catch (error) {
    console.warn("Logout request failed:", error.message);
  }

  currentUser = null;
  orders = [];

  setAccountButton();
  closeModal();

  showToast("You have been logged out.");

  window.location.replace("/login.html");
}

async function checkLoginStatus() {
  try {
    const data = await apiRequest("/api/auth/me");
    currentUser = data.user || null;
  } catch {
    currentUser = null;
  }

  setAccountButton();
}

/* =========================================
   CHECKOUT
========================================= */

function showCheckout() {
  if (!getCartDetails().length) {
    showToast("Your cart is empty.");
    return;
  }

  if (!currentUser) {
    openModal("Log in to continue", `
      <p>Please log in before placing an order.</p>
      <button
        class="primary-button"
        type="button"
        data-action="account">
        Log in
      </button>
    `);
    return;
  }

  openModal("Checkout", `
    <p class="checkout-total">
      Order total: <strong>${money(getCartTotal())}</strong>
    </p>

    <form id="checkoutForm" class="store-form">
      <label class="form-field">
        <span>Full name</span>
        <input
          name="full_name"
          type="text"
          maxlength="100"
          required
          autocomplete="name"
          placeholder="Recipient's full name">
      </label>

      <label class="form-field">
        <span>Contact number</span>
        <input
          name="contact_number"
          type="tel"
          maxlength="20"
          required
          autocomplete="tel"
          placeholder="09XXXXXXXXX">
      </label>

      <label class="form-field">
        <span>Complete delivery address</span>
        <textarea
          name="address"
          maxlength="500"
          required
          autocomplete="street-address"
          placeholder="House number, street, barangay, city"></textarea>
      </label>

      <label class="form-field">
        <span>Delivery instructions (optional)</span>
        <textarea
          name="instructions"
          maxlength="300"
          placeholder="Landmark or other instructions"></textarea>
      </label>

      <fieldset class="payment-options">
        <legend>Payment method</legend>

        <label class="payment-option">
          <input type="radio" name="payment_method" value="COD" checked>
          <span>
            <strong>Cash on Delivery</strong>
            <small>Pay when your order arrives.</small>
          </span>
        </label>

        <label class="payment-option">
          <input type="radio" name="payment_method" value="MAYA">
          <span>
            <strong>Maya Sandbox</strong>
            <small>Test checkout only; no real payment.</small>
          </span>
        </label>
      </fieldset>

      <p class="form-message" id="checkoutMessage" role="status"></p>

      <button class="primary-button" type="submit">
        Place Order
      </button>
    </form>
  `);
}

async function submitCheckout(form) {
  const message = $("#checkoutMessage");
  const button = form.querySelector('[type="submit"]');
  const formData = new FormData(form);

  const paymentMethod =
    String(formData.get("payment_method") || "COD");

  const items = getCartDetails().map((item) => ({
    product_id: item.productId,
    quantity: item.quantity
  }));

  const payload = {
    items,
    full_name: String(formData.get("full_name") || "").trim(),
    contact_number: String(formData.get("contact_number") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    instructions: String(formData.get("instructions") || "").trim()
  };

  if (!currentUser) {
    if (message) message.textContent = "Please log in first.";
    return;
  }

  if (!items.length) {
    if (message) message.textContent = "Your cart is empty.";
    return;
  }

  if (
    !payload.full_name ||
    !payload.contact_number ||
    !payload.address
  ) {
    if (message) {
      message.textContent =
        "Please complete all required delivery details.";
    }
    return;
  }

  if (button) button.disabled = true;
  if (message) message.textContent = "Processing your checkout...";

  try {
    if (paymentMethod === "MAYA") {
      const result = await apiRequest("/api/checkout/maya", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!result.checkoutUrl) {
        throw new Error("The server did not return a Maya checkout URL.");
      }

      const checkoutUrl = new URL(result.checkoutUrl);

      if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "pg-sandbox.paymaya.com"
      ) {
        throw new Error("The returned URL is not a valid Maya Sandbox URL.");
      }

      window.location.assign(checkoutUrl.href);
      return;
    }

    const result = await apiRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        payment_method: "COD"
      })
    });

    if (!result.order) {
      throw new Error("The server did not return the saved order.");
    }

    cart = [];
    saveCart();
    updateCartCount();
    closeModal();

    showToast(`COD order #${result.order.id} submitted successfully.`);

    await showOrders();
  } catch (error) {
    if (message) {
      message.textContent = error.message;
    } else {
      showToast(error.message);
    }
  } finally {
    if (button) button.disabled = false;
  }
}

/* =========================================
   MAYA RETURN
========================================= */

function handleMayaReturn() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get("maya");

  if (!result) return;

  if (result === "success") {
    showToast("Returned from Maya. Payment must be verified by the server.");
  } else if (result === "failure") {
    showToast("Maya checkout failed. Check My Orders for the current status.");
  } else if (result === "cancel") {
    showToast("Maya checkout was cancelled. Your order may remain pending.");
  }

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

  if (currentUser) {
    showOrders();
  }
}

/* =========================================
   MY ORDERS
========================================= */

async function loadOrders() {
  if (!currentUser) {
    throw new Error("Please log in to view your orders.");
  }

  const data = await apiRequest("/api/orders");

  orders = Array.isArray(data.orders)
    ? data.orders
    : Array.isArray(data)
      ? data
      : [];

  return orders;
}

function renderOrders() {
  const list = $("#ordersList");

  if (!list) return;

  if (!orders.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No orders yet</h3>
        <p>Your orders will appear here after checkout.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = orders.map((order) => {
    let items = order.items || [];

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    const itemList = Array.isArray(items)
      ? items.map((item) => `
          <li>
            ${escapeHTML(item.product_name || item.name || "Product")}
            × ${Number(item.quantity || 0)}
          </li>
        `).join("")
      : "";

    const date = order.created_at
      ? new Date(order.created_at).toLocaleString("en-PH")
      : "Date unavailable";

    return `
      <article class="order-card" style="
        padding:16px;
        margin-bottom:14px;
        border:1px solid var(--border);
        border-radius:14px;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        ">
          <strong>Order #${escapeHTML(order.id)}</strong>
          <strong>${money(order.total_amount)}</strong>
        </div>

        <p>${escapeHTML(date)}</p>

        <p>
          Payment: ${escapeHTML(order.payment_method || "N/A")}
          · ${escapeHTML(order.payment_status || "PENDING")}
        </p>

        <p>Order status: ${escapeHTML(order.order_status || "PENDING")}</p>

        <p>Recipient: ${escapeHTML(order.full_name || "")}</p>
        <p>Delivery address: ${escapeHTML(order.delivery_address || "")}</p>

        <ul>${itemList}</ul>
      </article>
    `;
  }).join("");
}

async function showOrders() {
  const section = $("#ordersSection");
  const list = $("#ordersList");

  if (!section || !list) {
    showToast("The orders section is unavailable.");
    return;
  }

  if (!currentUser) {
    showAccount();
    return;
  }

  section.classList.remove("hidden");
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  list.innerHTML = '<p class="loading">Loading your orders...</p>';

  try {
    await loadOrders();
    renderOrders();
  } catch (error) {
    console.error("Orders loading error:", error);

    list.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load your orders</h3>
        <p>${escapeHTML(error.message)}</p>
        <button
          class="primary-button"
          type="button"
          data-action="my-orders">
          Try Again
        </button>
      </div>
    `;
  }
}

/* =========================================
   EVENTS
========================================= */

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");

  if (categoryButton) {
    setCategory(categoryButton.dataset.category);
    return;
  }

  const button = event.target.closest("[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  switch (action) {
    case "account":
      showAccount();
      break;

    case "cart":
      renderCart();
      break;

    case "add":
      addToCart(id);
      break;

    case "quantity":
      changeQuantity(id, Number(button.dataset.change || 0));
      break;

    case "clear-cart":
      clearCart();
      break;

    case "checkout":
      showCheckout();
      break;

    case "close-modal":
      closeModal();
      break;

    case "auth-tab":
      renderAuthForm(button.dataset.tab);
      break;

    case "my-orders":
      showOrders();
      break;

    case "hide-orders":
      $("#ordersSection")?.classList.add("hidden");
      break;

    case "retry-products":
      loadProducts();
      break;

    case "clear-search":
      currentSearch = "";

      if (searchInput) searchInput.value = "";

      setCategory("All");
      break;

    default:
      break;
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "searchForm") {
    event.preventDefault();

    currentSearch = String(searchInput?.value || "").trim();
    renderProducts();

    $("#menu")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    return;
  }

  if (event.target.id === "authForm") {
    event.preventDefault();
    submitAuth(event.target);
    return;
  }

  if (event.target.id === "checkoutForm") {
    event.preventDefault();
    submitCheckout(event.target);
  }
});

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

/* =========================================
   INITIALIZE
========================================= */

async function initializeStore() {
  updateCartCount();

  await checkLoginStatus();

  setAccountButton();

  await loadProducts();

  handleMayaReturn();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeStore,
    { once: true }
  );
} else {
  initializeStore();
}

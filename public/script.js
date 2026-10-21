
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
let toastTimer;
let cart = loadCart();
let orders = [];

/* =========================
   GENERAL HELPERS
========================= */

function money(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status}).`);
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
  }, 2800);
}

function openModal(title, html) {
  if (!modalBackdrop || !modalContent) return;

  if (modalTitle) modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop?.classList.add("hidden");
}

/* =========================
   CART STORAGE
========================= */

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("jfs_cart") || "[]");

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

    return product
      ? {
          ...item,
          product,
          subtotal: Number(product.price) * item.quantity
        }
      : null;
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

  const cartCount = $("#cartCount");
  if (cartCount) cartCount.textContent = count;
}

/* =========================
   PRODUCTS
========================= */

function renderProducts() {
  if (!productGrid) return;

  const filtered = products.filter((product) => {
    const matchesCategory =
      currentCategory === "All" ||
      product.category === currentCategory;

    const searchText = [
      product.name,
      product.category,
      product.description
    ].join(" ").toLowerCase();

    return matchesCategory &&
      searchText.includes(currentSearch.toLowerCase());
  });

  if (productCount) {
    productCount.textContent =
      `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`;
  }

  if (!filtered.length) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try another search or category.</p>
        <button type="button" class="secondary-button"
          data-action="clear-search">
          Show all products
        </button>
      </div>`;
    return;
  }

  productGrid.innerHTML = filtered.map((product) => {
    const image = product.image_url || "";
    const available = Number(product.stock ?? 0) > 0;

    return `
      <article class="product-card">
        <div class="product-image">
          ${image ? `
            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(product.name)}"
              loading="lazy"
              onerror="this.style.display='none'"
            >` : ""}
          <span class="product-category">
            ${escapeHTML(product.category || "Groceries")}
          </span>
        </div>

        <div class="product-info">
          <h3>${escapeHTML(product.name)}</h3>
          <p class="product-description">
            ${escapeHTML(product.description || "A great choice for your home.")}
          </p>

          <div class="product-bottom">
            <strong class="product-price">${money(product.price)}</strong>
            <button
              type="button"
              class="add-to-cart"
              data-action="add"
              data-id="${escapeHTML(product.id)}"
              ${available ? "" : "disabled"}
            >${available ? "＋ Add" : "Out of stock"}</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function setCategory(category) {
  currentCategory = category;

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.category === category
    );
  });

  renderProducts();
}

async function loadProducts() {
  if (productGrid) {
    productGrid.innerHTML =
      '<p class="loading">Loading products...</p>';
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
  } catch (error) {
    products = [];

    if (productGrid) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <h3>Products are temporarily unavailable</h3>
          <p>Check your Render server and Neon database connection.</p>
          <button class="primary-button" type="button"
            data-action="retry-products">
            Try Again
          </button>
        </div>`;
    }

    if (productCount) productCount.textContent = "Unavailable";

    console.error("Products loading error:", error.message);
    updateCartCount();
    return;
  }

  renderProducts();
  updateCartCount();
}

/* =========================
   SHOPPING CART
========================= */

function addToCart(id) {
  const product = getProduct(id);

  if (!product) {
    showToast("Product not found.");
    return;
  }

  const stock = Number(product.stock ?? 0);

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
  } else if (next > Number(product.stock ?? 0)) {
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
              <button type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.productId)}"
                data-change="-1"
                aria-label="Decrease quantity">−</button>

              <span>${item.quantity}</span>

              <button type="button"
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

      <button class="primary-button" type="button"
        data-action="checkout">
        Proceed to Checkout
      </button>

      <button class="secondary-button" type="button"
        data-action="clear-cart">
        Clear Cart
      </button>`
    : `
      <div class="empty-state">
        <h3>Your cart is empty</h3>
        <p>Add your favorite groceries to get started.</p>
        <button class="primary-button" type="button"
          data-action="close-modal">
          Continue Shopping
        </button>
      </div>`;

  openModal("Your Shopping Cart", content);
}

/* =========================
   LOGIN AND REGISTRATION
========================= */

function showAccount() {
  if (currentUser) {
    openModal("My Account", `
      <div class="account-panel">
        <h3>Hello, ${escapeHTML(
          currentUser.full_name || currentUser.username
        )}!</h3>

        <p>Username: <strong>
          ${escapeHTML(currentUser.username)}
        </strong></p>

        <button class="primary-button" type="button"
          data-action="my-orders">My Orders</button>

        <button class="secondary-button" type="button"
          data-action="logout">Log out</button>
      </div>
    `);
    return;
  }

  openModal("Log in", `
    <div class="auth-tabs">
      <button type="button" class="auth-tab active"
        data-action="auth-tab" data-tab="login">
        Log in
      </button>

      <button type="button" class="auth-tab"
        data-action="auth-tab" data-tab="register">
        Create account
      </button>
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
      ${registering ? `
        <label class="form-field">
          <span>Full name</span>
          <input name="full_name" type="text"
            maxlength="100" required autocomplete="name"
            placeholder="Enter your full name">
        </label>
      ` : ""}

      <label class="form-field">
        <span>Username</span>
        <input name="username" type="text"
          minlength="3" maxlength="50" required
          autocomplete="username"
          placeholder="Enter your username">
      </label>

      <label class="form-field">
        <span>Password</span>
        <input name="password" type="password"
          minlength="8" required
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
    button.classList.toggle("active", button.dataset.tab === mode);
  });
}

async function submitAuth(form) {
  const message = $("#authMessage");
  const button = form.querySelector("[type='submit']");
  const formData = new FormData(form);
  const isRegister = formData.has("full_name");

  const payload = {
    username: String(formData.get("username") || "").trim(),
    password: String(formData.get("password") || "")
  };

  if (isRegister) {
    payload.full_name = String(formData.get("full_name") || "").trim();
  }

  if (message) message.textContent = "Connecting to the server...";
  if (button) button.disabled = true;

  try {
    const data = await apiRequest(
      isRegister ? "/api/auth/register" : "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    if (isRegister) {
      if (message) {
        message.textContent = "Account created. You can now log in.";
      }

      showToast("Account created. Please log in.");
      renderAuthForm("login");
      return;
    }

    if (!data.user) {
      throw new Error("Login API did not return a user.");
    }

    currentUser = data.user;

    const accountButton = $("#accountButton");
    if (accountButton) accountButton.textContent = "♙ My Account";

    closeModal();
    showToast("Welcome to JABIÑAR FOOD STORE!");
  } catch (error) {
    if (message) {
      message.textContent = error.message.includes("Failed to fetch")
        ? "Cannot connect to the server. Check your Render deployment."
        : error.message;
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
    console.warn("Logout endpoint may not be configured:", error.message);
  }

  currentUser = null;
  orders = [];

  const accountButton = $("#accountButton");
  if (accountButton) accountButton.textContent = "♙ Log in";

  closeModal();
  showToast("You have been logged out.");
}

/* =========================
   CHECKOUT
========================= */

function showCheckout() {
  if (!getCartDetails().length) {
    showToast("Your cart is empty.");
    return;
  }

  if (!currentUser) {
    openModal("Log in to continue", `
      <p>Please log in or create an account before placing an order.</p>
      <button class="primary-button" type="button"
        data-action="account">
        Log in / Create account
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
        <input name="full_name" type="text"
          maxlength="100" required autocomplete="name"
          value="${escapeHTML(currentUser.full_name || "")}"
          placeholder="Recipient's full name">
      </label>

      <label class="form-field">
        <span>Contact number</span>
        <input name="contact_number" type="tel"
          maxlength="20" required autocomplete="tel"
          placeholder="09XXXXXXXXX">
      </label>

      <label class="form-field">
        <span>Complete delivery address</span>
        <textarea name="address" maxlength="500"
          required autocomplete="street-address"
          placeholder="House number, street, barangay, city"></textarea>
      </label>

      <label class="form-field">
        <span>Delivery instructions (optional)</span>
        <textarea name="instructions" maxlength="300"
          placeholder="Landmark or other instructions"></textarea>
      </label>

      <fieldset class="payment-options">
        <legend>Payment method</legend>

        <label class="payment-option">
          <input type="radio" name="payment_method"
            value="COD" checked>
          <span>
            <strong>Cash on Delivery</strong>
            <small>Pay when your order arrives.</small>
          </span>
        </label>

        <label class="payment-option">
          <input type="radio" name="payment_method"
            value="MAYA">
          <span>
            <strong>Maya</strong>
            <small>Requires a configured Maya Sandbox checkout.</small>
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
  const button = form.querySelector("[type='submit']");
  const formData = new FormData(form);
  const paymentMethod = String(
    formData.get("payment_method") || "COD"
  );

  if (!currentUser) {
    if (message) {
      message.textContent = "Please log in before placing an order.";
    }
    return;
  }

  const items = getCartDetails().map((item) => ({
    product_id: item.productId,
    quantity: item.quantity
  }));

  if (!items.length) {
    if (message) message.textContent = "Your cart is empty.";
    return;
  }

  if (paymentMethod === "MAYA") {
    if (message) {
      message.textContent =
        "Maya checkout is not confirmed as configured yet. No payment has been made.";
    }
    return;
  }

  const payload = {
    items,
    payment_method: "COD",
    full_name: String(formData.get("full_name") || "").trim(),
    contact_number: String(formData.get("contact_number") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    instructions: String(formData.get("instructions") || "").trim()
  };

  if (button) button.disabled = true;
  if (message) message.textContent = "Submitting your order...";

  try {
    const result = await apiRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!result.order) {
      throw new Error("The orders API did not return the saved order.");
    }

    cart = [];
    saveCart();
    updateCartCount();
    closeModal();

    showToast(`Order #${result.order.id} submitted successfully.`);
    await showOrders();
  } catch (error) {
    if (message) {
      message.textContent = error.message.includes("Failed to fetch")
        ? "Orders API is not ready. Your order has not been confirmed."
        : error.message;
    }
  } finally {
    if (button) button.disabled = false;
  }
}

/* =========================
   ORDER HISTORY
========================= */

async function loadOrders() {
  if (!currentUser) {
    orders = [];
    return;
  }

  try {
    const data = await apiRequest("/api/orders");
    orders = Array.isArray(data) ? data : (data.orders || []);
  } catch (error) {
    orders = [];
    throw error;
  }
}

async function showOrders() {
  closeModal();

  const section = $("#ordersSection");
  const list = $("#ordersList");

  if (!section || !list) {
    showToast("The orders section is unavailable.");
    return;
  }

  section.classList.remove("hidden");
  section.scrollIntoView({ behavior: "smooth" });

  if (!currentUser) {
    list.innerHTML = `
      <p>Please log in to view your orders.</p>
      <button class="primary-button" type="button"
        data-action="account">Log in</button>
    `;
    return;
  }

  list.innerHTML = '<p class="loading">Loading your orders...</p>';

  try {
    await loadOrders();

    if (!orders.length) {
      list.innerHTML = `
        <div class="empty-state">
          <h3>No saved orders yet</h3>
          <p>Your orders will appear here after checkout is configured.</p>
        </div>`;
      return;
    }

    list.innerHTML = orders.map((order) => `
      <article class="cart-item">
        <div class="cart-item-info">
          <strong>Order #${escapeHTML(order.id)}</strong>
          <p>Status: ${escapeHTML(order.status || order.order_status || "Pending")}</p>
          <p>Payment: ${escapeHTML(order.payment_method || "COD")}</p>
        </div>
        <strong>${money(order.total_amount ?? order.total ?? 0)}</strong>
      </article>
    `).join("");
  } catch (error) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load orders</h3>
        <p>${escapeHTML(error.message)}</p>
        <button class="primary-button" type="button"
          data-action="my-orders">Try Again</button>
      </div>`;
  }
}

/* =========================
   BUTTONS AND FORM EVENTS
========================= */

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");

  if (categoryButton) {
    setCategory(categoryButton.dataset.category);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  switch (action) {
    case "add":
      addToCart(button.dataset.id);
      break;

    case "cart":
      renderCart();
      break;

    case "account":
      showAccount();
      break;

    case "close-modal":
      closeModal();
      break;

    case "auth-tab":
      renderAuthForm(button.dataset.tab);
      break;

    case "quantity":
      changeQuantity(
        button.dataset.id,
        Number(button.dataset.change)
      );
      break;

    case "clear-cart":
      cart = [];
      saveCart();
      updateCartCount();
      renderCart();
      showToast("Cart cleared.");
      break;

    case "checkout":
      showCheckout();
      break;

    case "my-orders":
      showOrders();
      break;

    case "hide-orders":
      $("#ordersSection")?.classList.add("hidden");
      break;

    case "logout":
      logout();
      break;

    case "clear-search":
      currentSearch = "";
      if (searchInput) searchInput.value = "";
      setCategory("All");
      break;

    case "retry-products":
      loadProducts();
      break;
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "searchForm") {
    event.preventDefault();
    currentSearch = String(searchInput?.value || "").trim();
    renderProducts();
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

document.addEventListener("input", (event) => {
  if (event.target.id === "searchInput") {
    currentSearch = event.target.value.trim();
    renderProducts();
  }
});

modalBackdrop?.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

/* =========================
   START WEBSITE
========================= */

updateCartCount();
loadProducts();

          
            

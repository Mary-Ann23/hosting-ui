
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

const fallbackProducts = [
  { id: 1, name: "Fresh Apples", category: "Fresh Produce", price: 120, stock: 50, image_url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80", description: "Fresh and crunchy apples." },
  { id: 2, name: "Fresh Bananas", category: "Fresh Produce", price: 75, stock: 50, image_url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80", description: "Sweet bananas for everyday snacks." },
  { id: 3, name: "Fresh Vegetables", category: "Fresh Produce", price: 95, stock: 30, image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80", description: "A selection of fresh vegetables." },
  { id: 4, name: "Fresh Carrots", category: "Fresh Produce", price: 65, stock: 30, image_url: "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=600&q=80", description: "Fresh carrots for your meals." },
  { id: 5, name: "White Rice", category: "Groceries", price: 58, stock: 100, image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80", description: "Everyday rice for your family." },
  { id: 6, name: "Fresh Eggs", category: "Groceries", price: 110, stock: 40, image_url: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=600&q=80", description: "Eggs for breakfast and cooking." },
  { id: 7, name: "Cooking Oil", category: "Groceries", price: 95, stock: 35, image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80", description: "A kitchen essential." },
  { id: 8, name: "Fresh Milk", category: "Beverages", price: 89, stock: 25, image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80", description: "Milk for your daily routine." },
  { id: 9, name: "Orange Juice", category: "Beverages", price: 75, stock: 25, image_url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80", description: "Refreshing orange juice." },
  { id: 10, name: "Potato Chips", category: "Snacks", price: 35, stock: 40, image_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80", description: "A crunchy snack for break time." },
  { id: 11, name: "Fresh Bread", category: "Snacks", price: 55, stock: 25, image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80", description: "Bread for breakfast and merienda." },
  { id: 12, name: "Laundry Detergent", category: "Household Needs", price: 99, stock: 20, image_url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=600&q=80", description: "An everyday laundry essential." }
];

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

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("jfs_cart") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem("jfs_cart", JSON.stringify(cart));
  } catch {
    // Cart can still work temporarily if browser storage is unavailable.
  }
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

function getProduct(id) {
  return products.find((product) => String(product.id) === String(id));
}

function getCartDetails() {
  return cart.map((item) => {
    const product = getProduct(item.productId);

    return product
      ? { ...item, product, subtotal: Number(product.price) * item.quantity }
      : null;
  }).filter(Boolean);
}

function getCartTotal() {
  return getCartDetails().reduce((total, item) => total + item.subtotal, 0);
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const cartCount = $("#cartCount");

  if (cartCount) cartCount.textContent = count;
}

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

    return matchesCategory && searchText.includes(currentSearch.toLowerCase());
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
        <button type="button" class="secondary-button" data-action="clear-search">
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
          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(product.name)}"
            loading="lazy"
            onerror="this.style.display='none'"
          >
          <span class="product-category">${escapeHTML(product.category || "Groceries")}</span>
        </div>
        <div class="product-info">
          <h3>${escapeHTML(product.name)}</h3>
          <p class="product-description">${escapeHTML(product.description || "A great choice for your home.")}</p>
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
    button.classList.toggle("active", button.dataset.category === category);
  });

  renderProducts();
}

async function loadProducts() {
  if (productGrid) {
    productGrid.innerHTML = '<p class="loading">Loading products...</p>';
  }

  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Products API is not ready");

    const data = await response.json();
    const list = Array.isArray(data) ? data : data.products;

    if (!Array.isArray(list)) throw new Error("Invalid products response");

    products = list;
  } catch (error) {
    // Preview products keep the UI visible until the products API is added.
    products = fallbackProducts;
  }

  renderProducts();
  updateCartCount();
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product) return;

  const existing = cart.find((item) => String(item.productId) === String(id));
  const nextQuantity = existing ? existing.quantity + 1 : 1;

  if (nextQuantity > Number(product.stock ?? 0)) {
    showToast("Sorry, there is not enough stock available.");
    return;
  }

  if (existing) {
    existing.quantity = nextQuantity;
  } else {
    cart.push({ productId: product.id, quantity: 1 });
  }

  saveCart();
  updateCartCount();
  showToast(`${product.name} added to cart.`);
}

function changeQuantity(id, amount) {
  const item = cart.find((entry) => String(entry.productId) === String(id));
  const product = getProduct(id);

  if (!item || !product) return;

  const next = item.quantity + amount;

  if (next <= 0) {
    cart = cart.filter((entry) => String(entry.productId) !== String(id));
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
              <button type="button" data-action="quantity" data-id="${escapeHTML(item.productId)}" data-change="-1" aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-action="quantity" data-id="${escapeHTML(item.productId)}" data-change="1" aria-label="Increase quantity">+</button>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="cart-total">
        <span>Total</span>
        <strong>${money(getCartTotal())}</strong>
      </div>
      <button class="primary-button" type="button" data-action="checkout">
        Proceed to Checkout
      </button>
      <button class="secondary-button" type="button" data-action="clear-cart">
        Clear Cart
      </button>`
    : `
      <div class="empty-state">
        <h3>Your cart is empty</h3>
        <p>Add your favorite groceries to get started.</p>
        <button class="primary-button" type="button" data-action="close-modal">Continue Shopping</button>
      </div>`;

  openModal("Your Shopping Cart", content);
}

function showAccount() {
  if (currentUser) {
    openModal("My Account", `
      <div class="account-panel">
        <h3>Hello, ${escapeHTML(currentUser.full_name || currentUser.username)}!</h3>
        <p>You are signed in as <strong>${escapeHTML(currentUser.username)}</strong>.</p>
        <button class="primary-button" type="button" data-action="my-orders">My Orders</button>
        <button class="secondary-button" type="button" data-action="logout">Log out</button>
      </div>
    `);
    return;
  }

  openModal("Log in", `
    <div class="auth-tabs">
      <button type="button" class="auth-tab active" data-action="auth-tab" data-tab="login">Log in</button>
      <button type="button" class="auth-tab" data-action="auth-tab" data-tab="register">Create account</button>
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
          <input name="full_name" type="text" maxlength="100" required autocomplete="name" placeholder="Enter your full name">
        </label>` : ""}
      <label class="form-field">
        <span>Username</span>
        <input name="username" type="text" minlength="3" maxlength="50" required autocomplete="username" placeholder="Enter your username">
      </label>
      <label class="form-field">
        <span>Password</span>
        <input name="password" type="password" minlength="8" required autocomplete="${registering ? "new-password" : "current-password"}" placeholder="${registering ? "At least 8 characters" : "Enter your password"}">
      </label>
      <button class="primary-button" type="submit">${registering ? "Create Account" : "Log in"}</button>
      <p class="form-message" id="authMessage" role="status"></p>
    </form>
  `;

  document.querySelectorAll("[data-action='auth-tab']").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === mode);
  });
}

async function submitAuth(form) {
  const message = $("#authMessage");
  const submitButton = form.querySelector("[type='submit']");
  const formData = new FormData(form);
  const isRegister = Boolean(formData.get("full_name"));

  const payload = {
    username: String(formData.get("username") || "").trim(),
    password: String(formData.get("password") || "")
  };

  if (isRegister) {
    payload.full_name = String(formData.get("full_name") || "").trim();
  }

  if (message) message.textContent = "Connecting to the server...";
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch(
      isRegister ? "/api/auth/register" : "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Unable to complete this request.");
    }

    if (isRegister) {
      if (message) {
        message.textContent = "Account created. You can now log in.";
      }
      showToast("Account created. Please log in.");
      renderAuthForm("login");
      return;
    }

    if (!data.user) {
      throw new Error("The login API must return a user object.");
    }

    currentUser = data.user;
    $("#accountButton").textContent = "♙ My Account";
    closeModal();
    showToast("Welcome to JABIÑAR FOOD STORE!");
  } catch (error) {
    if (message) {
      message.textContent =
        error.message.includes("Failed to fetch")
          ? "Login API is not ready yet. We need to add the backend routes."
          : error.message;
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function showCheckout() {
  if (!getCartDetails().length) {
    showToast("Your cart is empty.");
    return;
  }

  openModal("Checkout", `
    <p class="checkout-total">Order total: <strong>${money(getCartTotal())}</strong></p>
    <form id="checkoutForm" class="store-form">
      <label class="form-field">
        <span>Full name</span>
        <input name="full_name" type="text" maxlength="100" required autocomplete="name" value="${escapeHTML(currentUser?.full_name || "")}" placeholder="Recipient's full name">
      </label>
      <label class="form-field">
        <span>Contact number</span>
        <input name="contact_number" type="tel" maxlength="20" required autocomplete="tel" placeholder="09XXXXXXXXX">
      </label>
      <label class="form-field">
        <span>Complete delivery address</span>
        <textarea name="address" maxlength="500" required autocomplete="street-address" placeholder="House number, street, barangay, city"></textarea>
      </label>
      <label class="form-field">
        <span>Delivery instructions (optional)</span>
        <textarea name="instructions" maxlength="300" placeholder="Landmark or other instructions"></textarea>
      </label>
      <fieldset class="payment-options">
        <legend>Payment method</legend>
        <label class="payment-option">
          <input type="radio" name="payment_method" value="COD" checked>
          <span><strong>Cash on Delivery</strong><small>Pay when your order arrives.</small></span>
        </label>
        <label class="payment-option">
          <input type="radio" name="payment_method" value="MAYA">
          <span><strong>Maya</strong><small>Online payment through an officially configured Maya checkout.</small></span>
        </label>
      </fieldset>
      <p class="form-message" id="checkoutMessage" role="status"></p>
      <button class="primary-button" type="submit">Place Order</button>
    </form>
  `);
}

async function submitCheckout(form) {
  const message = $("#checkoutMessage");
  const button = form.querySelector("[type='submit']");
  const data = new FormData(form);
  const paymentMethod = String(data.get("payment_method") || "COD");

  if (!currentUser) {
    if (message) message.textContent = "Please log in or create an account before placing an order.";
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
      message.textContent = "Maya checkout must first be configured in the server using official Maya Sandbox credentials. No payment has been made.";
    }
    return;
  }

  const payload = {
    items,
    payment_method: paymentMethod,
    full_name: String(data.get("full_name") || "").trim(),
    contact_number: String(data.get("contact_number") || "").trim(),
    address: String(data.get("address") || "").trim(),
    instructions: String(data.get("instructions") || "").trim()
  };

  if (button) button.disabled = true;
  if (message) message.textContent = "Submitting your order...";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "The order could not be saved.");
    }

    if (!result.order) {
      throw new Error("The orders API must return the saved order.");
    }

    cart = [];
    saveCart();
    updateCartCount();
    closeModal();

    showToast(`Order #${result.order.id} submitted successfully.`);
    await loadOrders();
    showOrders();
  } catch (error) {
    if (message) {
      message.textContent = error.message.includes("Failed to fetch")
        ? "Orders API is not ready yet. Your order has not been confirmed."
        : error.message;
    }
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadOrders() {
  if (!currentUser) {
    orders = [];
    return;
  }

  try {
    const response = await fetch("/api/orders");
    if (!response.ok) throw new Error("Orders API unavailable");

    const data = await response.json();
    orders = Array.isArray(data) ? data : (data.orders || []);
  } catch {
    orders = [];
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
  list.innerHTML = '<p class="loading">Loading your orders...</p>';

  if (!currentUser) {
    list.innerHTML = "<p>Please log in to view your orders.</p>";
    section.scrollIntoView({ behavior: "smooth" });
    return;
  }

  await loadOrders();

  if (!orders.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No saved orders yet</h3>
        <p>Orders will ap

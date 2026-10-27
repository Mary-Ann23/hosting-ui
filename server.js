
"use strict";

const express = require("express");
const path = require("path");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const { getPool } = require("./db");
const { testDatabase } = require("./modules");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET;

app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from environment variables.");
}

// PostgreSQL session configuration
app.use(
  session({
    name: "jabinar.sid",
    store: new PgSession({
      pool: getPool(),
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/"
    }
  })
);

// Require login
function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({
        success: false,
        message: "Please log in first."
      });
    }

    return res.redirect("/login.html");
  }

  next();
}

// Require admin: check the database every time
async function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in first."
    });
  }

  try {
    const result = await getPool().query(
      `SELECT is_admin
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.session.user.id]
    );

    if (
      result.rows.length === 0 ||
      result.rows[0].is_admin !== true
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access only."
      });
    }

    next();
  } catch (error) {
    console.error("Admin verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify admin permissions."
    });
  }
}

// Page helpers
function sendLoginPage(req, res) {
  return res.sendFile(
    path.join(__dirname, "public", "login.html")
  );
}

function sendHomePage(req, res) {
  return res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
}


 // Login page
app.get("/login.html", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  return sendLoginPage(req, res);
});

// Server status
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Node.js API is running!"
  });
});

// Database status
app.get("/api/database-status", async (req, res) => {
  try {
    await testDatabase();

    return res.json({
      success: true,
      message: "Neon PostgreSQL connected successfully!"
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    return res.status(503).json({
      success: false,
      message: "Database connection is not ready."
    });
  }
});

// Current logged-in account
app.get("/api/auth/me", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Not logged in."
    });
  }

  try {
    const result = await getPool().query(
      `SELECT is_admin
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Account not found."
      });
    }

    return res.json({
      success: true,
      user: {
        ...req.session.user,
        is_admin: result.rows[0].is_admin === true
      }
    });
  } catch (error) {
    console.error("Auth status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to check login status."
    });
  }
});

// Register account
// New accounts are customers, not admins.
app.post("/api/auth/register", async (req, res) => {
  try {
    const username =
      typeof req.body.username === "string"
        ? req.body.username.trim()
        : "";

    const password =
      typeof req.body.password === "string"
        ? req.body.password
        : "";

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3–30 characters and use only letters, numbers, or underscores."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await getPool().query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (username) DO NOTHING
       RETURNING id`,
      [username, passwordHash]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Username already exists. Please choose another."
      });
    }

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can now log in."
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create account right now."
    });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const username =
      typeof req.body.username === "string"
        ? req.body.username.trim()
        : "";

    const password =
      typeof req.body.password === "string"
        ? req.body.password
        : "";

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your username and password."
      });
    }

    const result = await getPool().query(
      `SELECT id, username, password_hash
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Incorrect username or password."
      });
    }

    const account = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      account.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect username or password."
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error("Session error:", error.message);

        return res.status(500).json({
          success: false,
          message: "Unable to start your session."
        });
      }

      req.session.user = {
        id: String(account.id),
        username: account.username
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError.message);

          return res.status(500).json({
            success: false,
            message: "Unable to save your session."
          });
        }

        return res.json({
          success: true,
          message: "Login successful.",
          user: req.session.user
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now."
    });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to log out."
      });
    }

    res.clearCookie("jabinar.sid", {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax"
    });

    return res.json({
      success: true,
      message: "Logged out successfully."
    });
  });
});

// Home page requires login
app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }

  return sendHomePage(req, res);
});

// Direct index.html access requires login
app.get("/index.html", requireAuth, (req, res) => {
  return sendHomePage(req, res);
});

 // Products API — logged-in customers only
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT id, name, description, price,
             image_url, stock, category
      FROM products
      ORDER BY id ASC
    `);

    return res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error("Products API error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load products."
    });
  }
});

// Create an order inside a database transaction
async function createOrder(client, userId, body, paymentMethod) {
  const fullName = String(body.full_name || "").trim();
  const contactNumber = String(body.contact_number || "").trim();
  const address = String(body.address || "").trim();
  const instructions = String(body.instructions || "").trim();
  const items = body.items;

  if (
    !fullName ||
    !contactNumber ||
    !address ||
    fullName.length > 150 ||
    contactNumber.length > 40 ||
    address.length > 1000 ||
    instructions.length > 1000
  ) {
    throw new Error("Please complete your delivery details.");
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new Error("Your cart is empty or invalid.");
  }

  const quantities = new Map();

  for (const item of items) {
    const id = Number(item.product_id);
    const quantity = Number(item.quantity);

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      throw new Error("Invalid product or quantity.");
    }

    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  for (const quantity of quantities.values()) {
    if (quantity > 100) {
      throw new Error("Total quantity for a product cannot exceed 100.");
    }
  }

  const ids = [...quantities.keys()];

  // Lock rows to help prevent simultaneous orders from overselling stock.
  const productResult = await client.query(
    `SELECT id, name, price, stock
     FROM products
     WHERE id = ANY($1::bigint[])
     ORDER BY id
     FOR UPDATE`,
    [ids]
  );

  if (productResult.rows.length !== ids.length) {
    throw new Error("One or more products are unavailable.");
  }

  const products = new Map(
    productResult.rows.map((product) => [
      Number(product.id),
      product
    ])
  );

  let total = 0;
  const orderItems = [];

  for (const [id, quantity] of quantities) {
    const product = products.get(id);
    const price = Number(product.price);
    const stock = Number(product.stock);

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Invalid product price.");
    }

    if (!Number.isFinite(stock) || stock < quantity) {
      throw new Error(`${product.name} does not have enough stock.`);
    }

    total += price * quantity;

    orderItems.push({
      id,
      name: product.name,
      quantity,
      price
    });
  }

  total = Math.round((total + Number.EPSILON) * 100) / 100;

  const orderResult = await client.query(
    `INSERT INTO orders (
       user_id, total_amount, payment_method,
       payment_status, order_status,
       full_name, contact_number,
       delivery_address, delivery_instructions
     )
     VALUES ($1, $2, $3, 'PENDING', 'PENDING', $4, $5, $6, $7)
     RETURNING id, total_amount, payment_method,
               payment_status, order_status, created_at`,
    [
      userId,
      total,
      paymentMethod,
      fullName,
      contactNumber,
      address,
      instructions
    ]
  );

  const order = orderResult.rows[0];

  for (const item of orderItems) {
    await client.query(
      `INSERT INTO order_items (
         order_id, product_id, product_name, quantity, price
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [order.id, item.id, item.name, item.quantity, item.price]
    );

    await client.query(
      `UPDATE products
       SET stock = stock - $1
       WHERE id = $2`,
      [item.quantity, item.id]
    );
  }

  return { order, orderItems, total };
}

// Transaction wrapper
async function createOrderTransaction(userId, body, method) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const result = await createOrder(
      client,
      userId,
      body,
      method
    );

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// COD checkout
app.post("/api/orders", requireAuth, async (req, res) => {
  try {
    const result = await createOrderTransaction(
      req.session.user.id,
      req.body,
      "COD"
    );

    return res.status(201).json({
      success: true,
      message: "Cash on Delivery order placed successfully.",
      order: result.order
    });
  } catch (error) {
    console.error("COD order error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to place your order."
    });
  }
});
// ========================================
// MAYA SANDBOX CHECKOUT
// ========================================

app.post("/api/checkout/maya", requireAuth, async (req, res) => {
  try {
    const publicKey = process.env.MAYA_PUBLIC_KEY;
    const baseUrl = process.env.MAYA_BASE_URL;
    const appUrl = process.env.APP_BASE_URL;

    if (!publicKey || !baseUrl || !appUrl) {
      return res.status(500).json({
        success: false,
        message: "Maya environment variables are missing."
      });
    }

    if (!baseUrl.startsWith("https://pg-sandbox.paymaya.com")) {
      return res.status(500).json({
        success: false,
        message: "Maya Sandbox URL is not configured correctly."
      });
    }

    // Create the order using the existing transaction function
    const result = await createOrderTransaction(
  req.session.user.id,
  req.body,
  "MAYA"
);

const order = result.order;
const orderId = order.id;
    const referenceNumber =
      `JFS-${orderId}-${crypto.randomUUID()}`.slice(0, 36);

    const checkoutPayload = {
      totalAmount: {
        value: Number(order.total_amount),
        currency: "PHP"
      },
      buyer: {
  firstName: String(req.body.full_name || "").trim(),
  contact: {
    phone: String(req.body.contact_number || "").trim()
  },
  shippingAddress: {
    firstName: String(req.body.full_name || "").trim(),
    line1: String(req.body.address || "").trim()
  }
},
      
items: result.orderItems.map((item) => ({
  name: String(item.name),
  quantity: Number(item.quantity),
  amount: {
    value: Number(item.price),
    currency: "PHP"
  },
  totalAmount: {
    value: Number(item.price) * Number(item.quantity),
    currency: "PHP"
  }
})),
requestReferenceNumber: referenceNumber,
      
      redirectUrl: {
        success: `${appUrl}/?maya=success`,
        failure: `${appUrl}/?maya=failure`,
        cancel: `${appUrl}/?maya=cancel`
      }
    };

    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/checkout/v1/checkouts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
  "Basic " +
  Buffer.from(`${process.env.MAYA_PUBLIC_KEY}:`).toString("base64")
        

        body: JSON.stringify(checkoutPayload)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (
      !response.ok ||
      !(data.redirectUrl) ||
      !(data.checkoutId || data.id)
    ) {
      console.error("Maya checkout creation failed:", {
        status: response.status,
        message: data.message || data.error || "Unknown error"
      });

      return res.status(502).json({
        success: false,
        message:
          "Unable to create Maya checkout. Please check the Maya Sandbox configuration."
      });
    }

    const checkoutId = data.checkoutId || data.id;

    await getPool().query(
      `UPDATE orders
       SET maya_checkout_id = $1
       WHERE id = $2 AND user_id = $3`,
      [checkoutId, orderId, req.session.user.id]
    );

    return res.json({
      success: true,
      message: "Maya checkout created.",
      checkoutUrl: data.redirectUrl,
      orderId
    });
  } catch (error) {
    console.error("Maya checkout error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to start Maya checkout."
    });
  }
});


app.post("/api/orders/:id/cancel", requireAuth, async (req, res) => {
  const client = await getPool().connect();

  try {
    const orderId = Number(req.params.id);
    const userId = req.session.user.id;

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID."
      });
    }

    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, order_status
       FROM orders
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [orderId, userId]
    );

    if (orderResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    const order = orderResult.rows[0];

    if (String(order.order_status).toUpperCase() !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Only pending orders can be cancelled."
      });
    }

    const itemsResult = await client.query(
      `SELECT product_id, quantity
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE products
         SET stock = stock + $1
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      `UPDATE orders
       SET order_status = 'CANCELLED'
       WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Order cancelled successfully."
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Cancel order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel order."
    });
  } finally {
    client.release();
  }
});

// ========================================
// CUSTOMER ORDER HISTORY
// ========================================

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const result = await getPool().query(
      `SELECT
         o.id,
         o.user_id,
         o.total_amount,
         o.payment_method,
         o.payment_status,
         o.order_status,
         o.full_name,
         o.contact_number,
         o.delivery_address,
         o.delivery_instructions,
         o.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'product_id', oi.product_id,
               'product_name', oi.product_name,
               'quantity', oi.quantity,
               'price', oi.price,
               'subtotal', (oi.price * oi.quantity)
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.session.user.id]
    );

    return res.json({
      success: true,
      orders: result.rows
    });
  } catch (error) {
    console.error("Customer orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load your orders."
    });
  }
});
// ========================================
// ADMIN: VIEW ALL ORDERS
// ========================================

app.get(
  "/api/admin/orders",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await getPool().query(
        `SELECT
           o.id,
           o.user_id,
           u.username,
           o.total_amount,
           o.payment_method,
           o.payment_status,
           o.order_status,
           o.full_name,
           o.contact_number,
           o.delivery_address,
           o.delivery_instructions,
           o.created_at,
           COALESCE(
             json_agg(
               json_build_object(
                 'product_id', oi.product_id,
                 'product_name', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'subtotal', (oi.price * oi.quantity)
               )
             ) FILTER (WHERE oi.id IS NOT NULL),
             '[]'::json
           ) AS items
         FROM orders o
         JOIN users u ON u.id = o.user_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         GROUP BY o.id, u.username
         ORDER BY o.created_at DESC`
      );

      return res.json({
        success: true,
        orders: result.rows
      });
    } catch (error) {
      console.error("Admin orders error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to load all orders."
      });
    }
  }
);


// ========================================
// ADMIN: UPDATE ORDER STATUS
// ========================================

app.patch(
  "/api/admin/orders/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const status = String(req.body.status || "")
        .trim()
        .toUpperCase();

      const allowedStatuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "CANCELLED"
      ];

      if (
        !Number.isSafeInteger(orderId) ||
        orderId <= 0 ||
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID or order status."
        });
      }

      const result = await getPool().query(
        `UPDATE orders
         SET order_status = $1
         WHERE id = $2
         RETURNING id, order_status, payment_status`,
        [status, orderId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found."
        });
      }

      return res.json({
        success: true,
        message: "Order status updated.",
        order: result.rows[0]
      });
    } catch (error) {
      console.error("Update order status error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to update order status."
      });
    }
  }
);


// ========================================
// ADMIN: CONFIRM COD PAYMENT
// ========================================

app.patch(
  "/api/admin/orders/:id/cod-payment",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const orderId = Number(req.params.id);

      if (!Number.isSafeInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID."
        });
      }

      const result = await getPool().query(
        `UPDATE orders
         SET payment_status = 'PAID'
         WHERE id = $1
           AND UPPER(payment_method) = 'COD'
           AND UPPER(payment_status) = 'PENDING'
         RETURNING id, payment_method, payment_status`,
        [orderId]
      );

      if (result.rowCount === 0) {
        return res.status(409).json({
          success: false,
          message:
            "Order not found, not COD, or payment is not pending."
        });
      }

      return res.json({
        success: true,
        message: "COD payment marked as received.",
        order: result.rows[0]
      });
    } catch (error) {
      console.error("COD payment update error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to update COD payment."
      });
    }
  }
);



/* ========================================
   CUSTOMER: DELETE OWN ORDER
   Only cancelled orders can be deleted.
======================================== */

app.delete("/api/orders/:id", requireAuth, async (req, res) => {
  const client = await getPool().connect();

  try {
    const orderId = Number(req.params.id);
    const userId = req.session.user.id;

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID."
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, order_status
       FROM orders
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [orderId, userId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    if (String(result.rows[0].order_status).toUpperCase() !== "CANCELLED") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Only cancelled orders can be deleted from My Orders."
      });
    }

    await client.query(
      "DELETE FROM order_items WHERE order_id = $1",
      [orderId]
    );

    await client.query(
      "DELETE FROM orders WHERE id = $1 AND user_id = $2",
      [orderId, userId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Cancelled order deleted successfully."
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Customer delete order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete order."
    });
  } finally {
    client.release();
  }
});


/* ========================================
   ADMIN: DELETE ANY ORDER
======================================== */

app.delete(
  "/api/admin/orders/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const client = await getPool().connect();

    try {
      const orderId = Number(req.params.id);

      if (!Number.isSafeInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID."
        });
      }

      await client.query("BEGIN");

      const result = await client.query(
        `SELECT id, order_status
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Order not found."
        });
      }

      const order = result.rows[0];
      const status = String(order.order_status).toUpperCase();

      // Restore stock only for a still-pending order.
      // CANCELLED orders already had their stock restored.
      if (status === "PENDING") {
        const items = await client.query(
          `SELECT product_id, quantity
           FROM order_items
           WHERE order_id = $1`,
          [orderId]
        );

        for (const item of items.rows) {
          await client.query(
            `UPDATE products
             SET stock = stock + $1
             WHERE id = $2`,
            [item.quantity, item.product_id]
          );
        }
      }

      await client.query(
        "DELETE FROM order_items WHERE order_id = $1",
        [orderId]
      );

      await client.query(
        "DELETE FROM orders WHERE id = $1",
        [orderId]
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: `Order #${orderId} deleted successfully.`
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});

      console.error("Admin delete order error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to delete order."
      });
    } finally {
      client.release();
    }
  }
);

// ========================================
// DATABASE CHECK
// ========================================

app.get("/api/db-check", requireAuth, async (req, res) => {
  try {
    const result = await testDatabase();

    return res.json({
      success: true,
      message: "Neon PostgreSQL connected successfully!",
      result
    });
  } catch (error) {
    console.error("Database check error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Database connection failed."
    });
  }
});


// ========================================
// SERVE FRONTEND FILES
// ========================================

app.use(
  express.static(path.join(__dirname, "public"), {
    index: false
  })
);


// ========================================
// START SERVER
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JABIÑAR FOOD STORE running on port ${PORT}`);
});

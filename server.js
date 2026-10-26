
const express = require("express");
const path = require("path");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
require("dotenv").config();

const { getPool } = require("./db");
const { testDatabase } = require("./modules");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET;

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from environment variables.");
}

// Session configuration: Neon PostgreSQL
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

// Authentication middleware
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

    res.json({
      success: true,
      message: "Neon PostgreSQL connected successfully!"
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(503).json({
      success: false,
      message: "Database connection is not ready."
    });
  }
});

// Check current login status
app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Not logged in."
    });
  }

  return res.json({
    success: true,
    user: req.session.user
  });
});

// Register account
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

    const db = getPool();

    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username already exists. Please choose another."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)`,
      [username, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can now log in."
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Username already exists. Please choose another."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create account right now."
    });
  }
});

// Log in
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

    const db = getPool();

    const result = await db.query(
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

    // Create a new session after successful login.
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

// Log out
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

// Home page: login required
app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }

  return sendHomePage(req, res);
});

// Direct access to index.html also requires login
app.get("/index.html", requireAuth, (req, res) => {
  return sendHomePage(req, res);
});

// Products: login required
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    const db = getPool();

    const result = await db.query(`
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
const crypto = require("crypto");

async function createOrder(client, userId, body, paymentMethod) {
  const fullName = String(body.full_name || "").trim();
  const contactNumber = String(body.contact_number || "").trim();
  const address = String(body.address || "").trim();
  const instructions = String(body.instructions || "").trim();
  const items = body.items;

  if (!fullName || !contactNumber || !address) {
    throw new Error("Please complete your delivery details.");
  }

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
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

  const ids = [...quantities.keys()];

  const productResult = await client.query(
    `SELECT id, name, price, stock
     FROM products
     WHERE id = ANY($1::int[])`,
    [ids]
  );

  if (productResult.rows.length !== ids.length) {
    throw new Error("One or more products are unavailable.");
  }

  const products = new Map(
    productResult.rows.map(product => [
      Number(product.id),
      product
    ])
  );

  let total = 0;
  const orderItems = [];

  for (const [id, quantity] of quantities) {
    const product = products.get(id);
    const price = Number(product.price);

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Invalid product price.");
    }

    if (Number(product.stock) < quantity) {
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
  }

  return {
    order,
    orderItems,
    total
  };
}

async function createOrderTransaction(userId, body, method) {
  const pool = getPool();
  const client = await pool.connect();

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
app.post("/api/checkout/maya", requireAuth, async (req, res) => {
  let orderId;

  try {
    const publicKey = process.env.MAYA_PUBLIC_KEY;
    const secretKey = process.env.MAYA_SECRET_KEY;
    const baseUrl = process.env.MAYA_BASE_URL;
    const appUrl = process.env.APP_BASE_URL;

    if (!publicKey || !baseUrl || !appUrl) {
      return res.status(503).json({
        success: false,
        message: "Maya Sandbox is not fully configured."
      });
    }

    if (!baseUrl.startsWith("https://pg-sandbox.paymaya.com")) {
      return res.status(503).json({
        success: false,
        message: "Maya Sandbox URL is invalid."
      });
    }

    const created = await createOrderTransaction(
      req.session.user.id,
      req.body,
      "MAYA"
    );

    orderId = created.order.id;

    const requestReferenceNumber =
      `JFS-${orderId}-${crypto.randomUUID()}`.slice(0, 36);

    const items = created.orderItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      amount: {
        value: Number(item.price.toFixed(2))
      },
      totalAmount: {
        value: Number(
          (item.price * item.quantity).toFixed(2)
        )
      }
    }));

    const payload = {
      totalAmount: {
        value: Number(created.total.toFixed(2)),
        currency: "PHP"
      },
      items,
      requestReferenceNumber,
      redirectUrl: {
        success: `${appUrl}/?maya=success`,
        failure: `${appUrl}/?maya=failure`,
        cancel: `${appUrl}/?maya=cancel`
      }
    };

    const auth = Buffer
      .from(`${publicKey}:`)
      .toString("base64");

    const response = await fetch(
      `${baseUrl}/checkout/v1/checkouts`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      }
    );


const data = await response.json();

const redirectHost = data.redirectUrl
  ? new URL(data.redirectUrl).hostname
  : null;

console.log("Maya checkout response:", {
  status: response.status,
  hasRedirectUrl: Boolean(data.redirectUrl),
  hasCheckoutId: Boolean(data.checkoutId || data.id),
  redirectHost,
  message: data.message || null
});
    
    if (!response.ok || !data.redirectUrl) {
      console.error("Maya create checkout failed:", {
        status: response.status,
        message: data.message
      });

      return res.status(502).json({
        success: false,
        message: "Unable to create Maya checkout. Please try again."
      });
    }

    await getPool().query(
      `UPDATE orders
       SET maya_checkout_id = $1
       WHERE id = $2 AND user_id = $3`,
      [
        data.checkoutId || data.id,
        orderId,
        req.session.user.id
      ]
    );

    return res.json({
      success: true,
      order: created.order,
      checkoutUrl: data.redirectUrl
    });
  } catch (error) {
    console.error("Maya checkout error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to start Maya checkout."
    });
  }
});
app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const result = await getPool().query(
      `SELECT
         o.id,
         o.total_amount,
         o.payment_method,
         o.payment_status,
         o.order_status,
         o.created_at,
         o.full_name,
         o.contact_number,
         o.delivery_address,
         COALESCE(
           json_agg(
             json_build_object(
               'product_id', oi.product_id,
               'product_name', oi.product_name,
               'quantity', oi.quantity,
               'price', oi.price
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
    console.error("My Orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load your orders."
    });
  }
});
// Serve CSS, JavaScript, images and other public assets.
// Do not automatically serve index.html.

app.get("/api/db-check", requireAuth, async (req, res) => {
  try {
    const db = getPool();

    const result = await db.query(`
      SELECT
        current_database() AS database_name,
        (SELECT COUNT(*) FROM products) AS total_products,
        (
          SELECT COUNT(*)
          FROM products
          WHERE image_url LIKE '%placehold.co%'
        ) AS placeholder_images
    `);

    return res.json({
      success: true,
      database: result.rows[0].database_name,
      total_products: Number(result.rows[0].total_products),
      placeholder_images: Number(result.rows[0].placeholder_images)
    });
  } catch (error) {
    console.error("Database check error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Database diagnostic failed."
    });
  }
});

app.use(
  express.static(path.join(__dirname, "public"), {
    index: false
  })
);

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server started on port " + PORT);
});
                            

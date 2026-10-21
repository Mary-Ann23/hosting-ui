
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

// Serve CSS, JavaScript, images and other public assets.
// Do not automatically serve index.html.
app.use(
  express.static(path.join(__dirname, "public"), {
    index: false
  })
);

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server started on port " + PORT);
});
                            



const express = require("express");
const path = require("path");
const { getPool } = require("./db");
require("dotenv").config();

const { testDatabase } = require("./modules");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Node.js API is running!"
  });
});

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

app.get("/api/products", async (req, res) => {
  try {
    const { getPool } = require("./db");
    const db = getPool();

    const result = await db.query(`
      SELECT id, name, description, price,
             image_url, stock, category
      FROM products
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error("Products API error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load products."
    });
  }
});
                  
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server started on port " + PORT);
});
        

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sequelize } = require("./models");
const { seedInitialData } = require("./utils/seed");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());

// Serve static frontend / interactive documentation
app.use(express.static(path.join(__dirname, "public")));

// Root & Health Check JSON Info
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "RESTful API Server is operational",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    documentation: "/docs",
    resources: {
      auth: {
        base: "/api/auth",
        endpoints: [
          "POST /api/auth/register",
          "POST /api/auth/login",
          "GET /api/auth/me",
          "GET /api/auth/activate?token=",
          "POST /api/auth/forgot-password",
          "POST /api/auth/reset-password",
          "POST /api/auth/logout",
        ],
      },
      users: {
        base: "/api/users",
        endpoints: [
          "GET /api/users",
          "GET /api/users/:id",
          "POST /api/users",
          "PUT /api/users/:id",
          "DELETE /api/users/:id",
        ],
      },
      roles: {
        base: "/api/roles",
        endpoints: [
          "GET /api/roles",
          "GET /api/roles/:id",
          "POST /api/roles",
          "PUT /api/roles/:id",
          "DELETE /api/roles/:id",
        ],
      },
      categories: {
        base: "/api/categories",
        endpoints: [
          "GET /api/categories",
          "GET /api/categories/:id",
          "POST /api/categories",
          "PUT /api/categories/:id",
          "DELETE /api/categories/:id",
        ],
      },
      products: {
        base: "/api/products",
        endpoints: [
          "GET /api/products",
          "GET /api/products/:id",
          "GET /api/products/:id/photo",
          "POST /api/products",
          "PUT /api/products/:id",
          "DELETE /api/products/:id",
        ],
      },
      orders: {
        base: "/api/orders",
        endpoints: [
          "GET /api/orders",
          "GET /api/orders/:id",
          "GET /api/orders/invoice/:invoice_number",
          "GET /api/orders/stats",
          "GET /api/orders/postman",
          "POST /api/orders",
          "PUT /api/orders/:id",
          "PATCH /api/orders/:id/status",
          "DELETE /api/orders/:id",
        ],
      },
      order_items: {
        base: "/api/order-items",
        endpoints: ["GET /api/order-items", "GET /api/order-items/:id"],
      },
    },
  });
});

app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Mount Routes under both /api/* and root /* for maximum compatibility
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const orderItemRoutes = require("./routes/orderItemRoutes");

// /api routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order-items", orderItemRoutes);

// root routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/roles", roleRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/order-items", orderItemRoutes);

// Fallback 404 for undefined API routes
app.use((req, res, next) => {
  if (req.accepts("json")) {
    return res.status(404).json({
      success: false,
      message: `Rute '${req.method} ${req.originalUrl}' tidak ditemukan pada REST API ini.`,
    });
  }
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("[Error Handler]", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Terjadi kesalahan internal pada server",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start HTTP Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` RESTful API Server running on port ${PORT}`);
  console.log(` Interactive Docs & Console: http://localhost:${PORT}`);
  console.log(` API Endpoint JSON: http://localhost:${PORT}/api`);
  console.log(`=========================================`);
});

// Connect & Sync Database
sequelize
  .authenticate()
  .then(async () => {
    console.log("[Database] PostgreSQL connection established successfully.");
    await sequelize.sync({ alter: true });
    console.log("[Database] Models synchronized with schema.");
    await seedInitialData();
  })
  .catch((err) => {
    console.error("[Database Error]", err.message || err);
  });

module.exports = app;

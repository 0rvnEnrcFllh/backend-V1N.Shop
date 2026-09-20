const express = require("express");
const router = express.Router();
const path = require("path");
const orderController = require("../controllers/orderController");

// Postman Collection JSON Download (place before parameterized :id)
router.get("/postman", (req, res) => {
  const filePath = path.join(
    __dirname,
    "../public/orders-checkout-postman-collection.json",
  );
  res.download(filePath, "orders-checkout-postman-collection.json");
});

// Statistics route (place before parameterized :id)
router.get("/stats", orderController.getOrderStatistics);

// Find by invoice number
router.get("/invoice/:invoice_number", orderController.getOrderByInvoice);

// Standard CRUD
router.get("/", orderController.getAllOrders);
router.get("/:id", orderController.getOrderById);
router.post("/", orderController.createOrder);
router.put("/:id", orderController.updateOrder);
router.patch("/:id/status", orderController.updateOrderStatus);
router.delete("/:id", orderController.deleteOrder);

module.exports = router;

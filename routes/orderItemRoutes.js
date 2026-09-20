const express = require("express");
const router = express.Router();
const orderItemController = require("../controllers/orderItemController");

router.get("/", orderItemController.getAllOrderItems);
router.get("/:id", orderItemController.getOrderItemById);

module.exports = router;

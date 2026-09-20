const { OrderItem, Order, Product } = require("../models");

/**
 * Get all order items with optional filtering by order_id or product_id
 */
const getAllOrderItems = async (req, res) => {
  try {
    const { order_id, product_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = {};

    if (order_id) whereClause.order_id = parseInt(order_id, 10);
    if (product_id) whereClause.product_id = parseInt(product_id, 10);

    const { count, rows: items } = await OrderItem.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: "order",
          attributes: [
            "id",
            "invoice_number",
            "status",
            "recipient_name",
            "created_at",
          ],
        },
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "price", "categoryName"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      success: true,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
      data: items,
    });
  } catch (error) {
    console.error("[OrderItemController.getAllOrderItems]", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat item pesanan: " + error.message,
    });
  }
};

/**
 * Get single order item by ID
 */
const getOrderItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await OrderItem.findByPk(id, {
      include: [
        {
          model: Order,
          as: "order",
        },
        {
          model: Product,
          as: "product",
        },
      ],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Order Item #${id} tidak ditemukan.`,
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("[OrderItemController.getOrderItemById]", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat detail item pesanan: " + error.message,
    });
  }
};

module.exports = {
  getAllOrderItems,
  getOrderItemById,
};

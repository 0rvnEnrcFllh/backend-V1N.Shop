const axios = require("axios");
const { Order, OrderItem, User, Product, sequelize } = require("../models");
const { Op } = require("sequelize");

/**
 * Generate unique invoice number: INV/YYYYMMDD/TOK/XXXX
 */
const generateInvoiceNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${year}${month}${day}`;

  // Count today's orders
  const todayOrdersCount = await Order.count({
    where: {
      invoice_number: {
        [Op.like]: `INV/${datePrefix}/%`,
      },
    },
  });

  const sequence = String(todayOrdersCount + 1).padStart(4, "0");
  return `INV/${datePrefix}/TOK/${sequence}`;
};

/**
 * Get all orders with filtering, sorting, and pagination
 */
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      payment_status,
      user_id,
      search,
      sort_by = "created_at",
      sort_order = "DESC",
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = {};

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    if (payment_status) {
      whereClause.payment_status = payment_status.toUpperCase();
    }

    if (user_id) {
      whereClause.user_id = parseInt(user_id, 10);
    }

    if (search) {
      whereClause[Op.or] = [
        { invoice_number: { [Op.iLike]: `%${search}%` } },
        { recipient_name: { [Op.iLike]: `%${search}%` } },
        { recipient_phone: { [Op.iLike]: `%${search}%` } },
        { shipping_tracking_no: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const validSortFields = ["created_at", "updated_at", "grand_total", "id"];
    const actualSortField = validSortFields.includes(sort_by)
      ? sort_by
      : "created_at";
    const actualSortOrder = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "price", "categoryName", "stock"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [[actualSortField, actualSortOrder]],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      success: true,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
      data: orders,
    });
  } catch (error) {
    console.error("[OrderController.getAllOrders]", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat daftar pesanan: " + error.message,
    });
  }
};

/**
 * Get single order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "price", "categoryName", "stock"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Pesanan dengan ID #${id} tidak ditemukan.`,
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("[OrderController.getOrderById]", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat detail pesanan: " + error.message,
    });
  }
};

/**
 * Get order by invoice number
 */
const getOrderByInvoice = async (req, res) => {
  try {
    const { invoice_number } = req.params;

    const order = await Order.findOne({
      where: { invoice_number },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "price", "categoryName", "stock"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Pesanan dengan invoice '${invoice_number}' tidak ditemukan.`,
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("[OrderController.getOrderByInvoice]", error);
    res.status(500).json({
      success: false,
      message: "Gagal mencari invoice pesanan: " + error.message,
    });
  }
};

/**
 * Create a new order with items in a transaction
 */
const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      invoice_number,
      user_id,
      status = "PENDING",
      shipping_cost = 0,
      discount_amount = 0,
      tax_amount = 0,
      payment_method,
      payment_status = "UNPAID",
      payment_reference,
      recipient_name,
      recipient_phone,
      shipping_address,
      shipping_courier,
      shipping_tracking_no,
      notes,
      paid_at,
      items = [],
    } = req.body;

    // Validation
    if (!recipient_name || !recipient_phone || !shipping_address) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "recipient_name, recipient_phone, dan shipping_address wajib diisi.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Pesanan harus memiliki minimal satu item produk dalam array items.",
      });
    }

    // Process items & compute total
    let computedTotalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      let itemPrice = parseFloat(item.price);
      let itemName = item.product_name;
      const quantity = parseInt(item.quantity, 10);

      if (isNaN(quantity) || quantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Quantity untuk item harus lebih besar dari 0.`,
        });
      }

      // If product_id given, snapshot details from existing product if not provided
      if (item.product_id) {
        const product = await Product.findByPk(item.product_id, {
          transaction,
        });
        if (product) {
          if (!itemName) itemName = product.name;
          if (isNaN(itemPrice)) itemPrice = parseFloat(product.price);
        }
      }

      if (!itemName) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "product_name wajib ada untuk setiap item.",
        });
      }

      if (isNaN(itemPrice) || itemPrice < 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Harga tidak valid untuk produk '${itemName}'.`,
        });
      }

      const itemSubtotal = parseFloat((itemPrice * quantity).toFixed(2));
      computedTotalAmount += itemSubtotal;

      processedItems.push({
        product_id: item.product_id || null,
        product_name: itemName,
        price: itemPrice,
        quantity,
        subtotal: itemSubtotal,
        product_photo_url: item.product_photo_url || null,
        notes: item.notes || null,
      });
    }

    // Generate or use invoice number
    var finalInvoiceNumber = invoice_number || (await generateInvoiceNumber());

    // Calculate grand_total: (subtotal + shipping + tax - discount)
    const parsedShipping = parseFloat(shipping_cost) || 0;
    const parsedDiscount = parseFloat(discount_amount) || 0;
    const parsedTax = parseFloat(tax_amount) || 0;
    const grandTotal = parseFloat(
      Math.max(
        0,
        computedTotalAmount + parsedShipping + parsedTax - parsedDiscount,
      ).toFixed(2),
    );

    // Determine paid_at
    let finalPaidAt = paid_at || null;
    if (payment_status === "PAID" && !finalPaidAt) {
      finalPaidAt = new Date();
    }

    // Handle Payment Reference & Midtrans Payment Gateway Integration
    let finalPaymentReference = payment_reference || null;

    if (payment_method === "Midtrans Payment Gateway") {
      console.log("Processing Midtrans Payment Gateway integration.");
      finalInvoiceNumber = "POS-ST-JANI-" + Date.now(); // Ensure invoice number is set for Midtrans
      try {
        const grossAmount = req.body.gross_amount
          ? parseInt(req.body.gross_amount, 10)
          : Math.round(grandTotal) > 0
            ? Math.round(grandTotal)
            : 10000;

        const midtransData = JSON.stringify({
          transaction_details: {
            order_id: finalInvoiceNumber,
            // "order_id": "POS-ST-JANI-" + Date.now(),
            gross_amount: grossAmount,
          },
          credit_card: {
            secure: true,
          },
        });

        const midtransHeaders = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        if (process.env.MIDTRANS_SERVER_KEY) {
          const authKey = Buffer.from(
            `${process.env.MIDTRANS_SERVER_KEY}:`,
          ).toString("base64");
          midtransHeaders["Authorization"] = `Basic ${authKey}`;
          console.log("Using Midtrans Server Key for Authorization.");
          console.log(
            "Authorization Header:",
            midtransHeaders["Authorization"],
          );
        }

        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://app.sandbox.midtrans.com/snap/v1/transactions",
          headers: midtransHeaders,
          data: midtransData,
        };

        const response = await axios.request(config);
        console.log(JSON.stringify(response.data));

        if (response && response.data && response.data.redirect_url) {
          finalPaymentReference = response.data.redirect_url;
        }
      } catch (error) {
        console.log(error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.redirect_url
        ) {
          finalPaymentReference = error.response.data.redirect_url;
        }
      }
    }

    // Create Order Header
    const newOrder = await Order.create(
      {
        invoice_number: finalInvoiceNumber,
        user_id: user_id ? parseInt(user_id, 10) : null,
        status,
        total_amount: computedTotalAmount,
        shipping_cost: parsedShipping,
        discount_amount: parsedDiscount,
        tax_amount: parsedTax,
        grand_total: grandTotal,
        payment_method,
        payment_status,
        payment_reference: finalPaymentReference,
        recipient_name,
        recipient_phone,
        shipping_address,
        shipping_courier,
        shipping_tracking_no,
        notes,
        paid_at: finalPaidAt,
      },
      { transaction },
    );

    // Create Order Items
    const itemsToInsert = processedItems.map((item) => ({
      ...item,
      order_id: newOrder.id,
    }));

    await OrderItem.bulkCreate(itemsToInsert, { transaction });

    await transaction.commit();

    // Fetch complete order with relations
    const createdOrder = await Order.findByPk(newOrder.id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "price", "categoryName", "stock"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat.",
      data: createdOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("[OrderController.createOrder]", error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat pesanan: " + error.message,
    });
  }
};

/**
 * Update order details / status
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Pesanan #${id} tidak ditemukan.`,
      });
    }

    const allowedUpdates = [
      "status",
      "shipping_courier",
      "shipping_tracking_no",
      "shipping_address",
      "recipient_name",
      "recipient_phone",
      "notes",
      "payment_method",
      "payment_status",
      "payment_reference",
    ];

    const updates = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Auto-set paid_at if payment_status changed to PAID
    if (updates.payment_status === "PAID" && !order.paid_at) {
      updates.paid_at = new Date();
    }

    await order.update(updates);

    const updated = await Order.findByPk(id, {
      include: [
        { model: OrderItem, as: "items" },
        { model: User, as: "user", attributes: ["id", "name", "email"] },
      ],
    });

    res.json({
      success: true,
      message: "Pesanan berhasil diperbarui.",
      data: updated,
    });
  } catch (error) {
    console.error("[OrderController.updateOrder]", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui pesanan: " + error.message,
    });
  }
};

/**
 * Update order status specifically
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, shipping_tracking_no } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Pesanan #${id} tidak ditemukan.`,
      });
    }

    const validStatuses = [
      "PENDING",
      "PAID",
      "PROCESSING",
      "SHIPPED",
      "COMPLETED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilihan status: ${validStatuses.join(", ")}`,
      });
    }

    const updates = { status: status.toUpperCase() };
    if (notes) updates.notes = notes;
    if (shipping_tracking_no)
      updates.shipping_tracking_no = shipping_tracking_no;

    if (updates.status === "PAID" && !order.paid_at) {
      updates.payment_status = "PAID";
      updates.paid_at = new Date();
    }

    await order.update(updates);

    res.json({
      success: true,
      message: `Status pesanan #${id} berhasil diubah menjadi ${updates.status}.`,
      data: order,
    });
  } catch (error) {
    console.error("[OrderController.updateOrderStatus]", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui status pesanan: " + error.message,
    });
  }
};

/**
 * Delete order
 */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Pesanan #${id} tidak ditemukan.`,
      });
    }

    // Due to CASCADE, order_items will be deleted automatically
    await order.destroy();

    res.json({
      success: true,
      message: `Pesanan #${id} (${order.invoice_number}) berhasil dihapus.`,
    });
  } catch (error) {
    console.error("[OrderController.deleteOrder]", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pesanan: " + error.message,
    });
  }
};

/**
 * Get summary stats for e-commerce orders
 */
const getOrderStatistics = async (req, res) => {
  try {
    const totalOrders = await Order.count();
    const pendingOrders = await Order.count({ where: { status: "PENDING" } });
    const paidOrders = await Order.count({ where: { payment_status: "PAID" } });
    const shippedOrders = await Order.count({ where: { status: "SHIPPED" } });
    const completedOrders = await Order.count({
      where: { status: "COMPLETED" },
    });
    const totalRevenue =
      (await Order.sum("grand_total", { where: { payment_status: "PAID" } })) ||
      0;
    const totalItemsSold = (await OrderItem.sum("quantity")) || 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        paidOrders,
        shippedOrders,
        completedOrders,
        totalRevenue: parseFloat(totalRevenue),
        totalItemsSold: parseInt(totalItemsSold, 10),
      },
    });
  } catch (error) {
    console.error("[OrderController.getOrderStatistics]", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat statistik pesanan: " + error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrderByInvoice,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStatistics,
};

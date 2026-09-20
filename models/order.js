const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: "Nomor invoice unik (misal: INV/20260901/TOK/001)",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      comment: "Foreign Key ke users(id) (siapa yang membeli)",
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "PENDING",
      validate: {
        isIn: [
          [
            "PENDING",
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "COMPLETED",
            "CANCELLED",
          ],
        ],
      },
      comment:
        "Status pesanan: 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'",
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: "Total harga produk sebelum ongkir & diskon",
    },
    shipping_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: "Ongkos kirim",
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: "Potongan kupon / voucher promo (default 0)",
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: "Pajak (PPN/Tax jika ada, default 0)",
    },
    grand_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment:
        "Total akhir yang harus dibayar: (subtotal + shipping + tax - discount)",
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment:
        "Metode pembayaran (misal: bank_transfer, gopay, qris, cod, midtrans)",
    },
    payment_status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "UNPAID",
      validate: {
        isIn: [["UNPAID", "PAID", "EXPIRED", "REFUNDED"]],
      },
      comment: "Status pembayaran: 'UNPAID', 'PAID', 'EXPIRED', 'REFUNDED'",
    },
    payment_reference: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment:
        "ID transaksi / redirect URL dari payment gateway (Midtrans Snap redirect_url / Stripe ID)",
    },
    recipient_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Nama lengkap penerima paket",
    },
    recipient_phone: {
      type: DataTypes.STRING(25),
      allowNull: false,
      comment: "Nomor telepon / WhatsApp penerima",
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Alamat lengkap pengiriman",
    },
    shipping_courier: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Kurir ekspedisi (misal: JNE, J&T, SiCepat)",
    },
    shipping_tracking_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Nomor resi pengiriman (diisi saat pesanan dikirim)",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Catatan dari pembeli untuk penjual",
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Waktu pembayaran terkonfirmasi",
    },
  },
  {
    tableName: "orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["invoice_number"],
      },
    ],
  },
);

module.exports = Order;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrderItem = sequelize.define(
  "OrderItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "orders",
        key: "id",
      },
      onDelete: "CASCADE",
      comment: "Foreign Key ke orders(id) ON DELETE CASCADE",
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "SET NULL",
      comment: "Foreign Key ke products(id) (bisa ON DELETE SET NULL)",
    },
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Nama produk saat dibeli (snapshot)",
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: "Harga satuan produk saat checkout (snapshot)",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
      comment: "Jumlah unit yang dibeli (CHECK (quantity > 0))",
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: "Total per item (price * quantity)",
    },
    product_photo_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "(Opsional) URL gambar produk saat dibeli",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '(Opsional) Catatan varian (misal: "Ukuran XL, Warna Hitam")',
    },
  },
  {
    tableName: "order_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = OrderItem;

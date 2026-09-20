const sequelize = require("../config/database");
const Role = require("./role");
const User = require("./user");
const Category = require("./category");
const Product = require("./product");
const Order = require("./order");
const OrderItem = require("./orderItem");

// many to many relation
User.belongsToMany(Role, {
  through: "UserRoles",
  as: "roles",
  foreignKey: "userId",
});
Role.belongsToMany(User, {
  through: "UserRoles",
  as: "users",
  foreignKey: "roleId",
});

// relasi one to many
Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "categoryRef" });

// 1. Relasi One to Many antara tabel orders dengan order_items
Order.hasMany(OrderItem, {
  foreignKey: "order_id",
  as: "items",
  onDelete: "CASCADE",
});
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });

// 2. Relasi One to Many antara tabel users dengan orders
User.hasMany(Order, { foreignKey: "user_id", as: "orders" });
Order.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 3. Relasi One to Many antara tabel products dengan order_items
Product.hasMany(OrderItem, {
  foreignKey: "product_id",
  as: "order_items",
  onDelete: "SET NULL",
});
OrderItem.belongsTo(Product, { foreignKey: "product_id", as: "product" });

module.exports = {
  Role,
  User,
  Product,
  Category,
  Order,
  OrderItem,
  sequelize,
};

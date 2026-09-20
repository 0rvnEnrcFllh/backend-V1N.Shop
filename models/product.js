const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    reviews: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    tag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photo: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    photoMime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "products",
    timestamps: true,
  },
);

module.exports = Product;

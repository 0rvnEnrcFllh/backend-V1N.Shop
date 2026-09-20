const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define(
  "category",
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
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Tag",
    },
    itemCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    colorClass: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "bg-primary-subtle text-primary border-primary-subtle",
    },
    popularItem: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "categories",
    timestamps: true,
  },
);

module.exports = Category;

const { Category, Product } = require("../models");
const { Op } = require("sequelize");

// Helper to generate URL-friendly slug
const generateSlug = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

exports.getCategories = async (req, res) => {
  try {
    const { search, slug } = req.query;
    const where = {};

    if (slug) {
      where.slug = slug;
    }

    if (search) {
      const searchClause = { [Op.iLike ? Op.iLike : Op.like]: `%${search}%` };
      where[Op.or] = [
        { name: searchClause },
        { slug: searchClause },
        { description: searchClause },
        { popularItem: searchClause },
      ];
    }

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: Product,
          as: "products",
          attributes: ["id", "name", "price", "stock"],
        },
      ],
      order: [["id", "ASC"]],
    });

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug || generateSlug(cat.name),
      icon: cat.icon || "Tag",
      itemCount:
        cat.products && cat.products.length > 0
          ? cat.products.length
          : cat.itemCount || 0,
      description: cat.description || null,
      colorClass:
        cat.colorClass ||
        "bg-primary-subtle text-primary border-primary-subtle",
      popularItem: cat.popularItem || null,
      productCount: cat.products ? cat.products.length : 0,
      products: cat.products,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    res.json({
      success: true,
      message: "Berhasil mengambil daftar kategori",
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar kategori",
      error: error.message,
    });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);

    let category;
    if (isNumeric) {
      category = await Category.findByPk(id, {
        include: [
          {
            model: Product,
            as: "products",
            attributes: ["id", "name", "price", "stock", "createdAt"],
          },
        ],
      });
    } else {
      // Support lookup by slug as well
      category = await Category.findOne({
        where: { slug: id },
        include: [
          {
            model: Product,
            as: "products",
            attributes: ["id", "name", "price", "stock", "createdAt"],
          },
        ],
      });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Kategori '${id}' tidak ditemukan`,
      });
    }

    const data = {
      id: category.id,
      name: category.name,
      slug: category.slug || generateSlug(category.name),
      icon: category.icon || "Tag",
      itemCount:
        category.products && category.products.length > 0
          ? category.products.length
          : category.itemCount || 0,
      description: category.description || null,
      colorClass:
        category.colorClass ||
        "bg-primary-subtle text-primary border-primary-subtle",
      popularItem: category.popularItem || null,
      productCount: category.products ? category.products.length : 0,
      products: category.products,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };

    res.json({
      success: true,
      message: "Berhasil mengambil detail kategori",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail kategori",
      error: error.message,
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      icon,
      itemCount,
      description,
      colorClass,
      popularItem,
    } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nama kategori wajib diisi",
      });
    }

    const finalSlug = slug ? generateSlug(slug) : generateSlug(name);

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      icon: icon || "Tag",
      itemCount:
        typeof itemCount === "number"
          ? itemCount
          : parseInt(itemCount, 10) || 0,
      description: description ? description.trim() : null,
      colorClass: colorClass
        ? colorClass.trim()
        : "bg-primary-subtle text-primary border-primary-subtle",
      popularItem: popularItem ? popularItem.trim() : null,
    });

    res.status(201).json({
      success: true,
      message: "Kategori baru berhasil ditambahkan",
      data: category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal membuat kategori baru",
      error: error.message,
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      icon,
      itemCount,
      description,
      colorClass,
      popularItem,
    } = req.body;

    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Kategori dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Nama kategori tidak boleh kosong",
        });
      }
      category.name = name.trim();
    }

    if (slug !== undefined) {
      category.slug = generateSlug(slug);
    } else if (name !== undefined && !category.slug) {
      category.slug = generateSlug(name);
    }

    if (icon !== undefined) {
      category.icon = icon;
    }

    if (itemCount !== undefined) {
      category.itemCount =
        typeof itemCount === "number"
          ? itemCount
          : parseInt(itemCount, 10) || 0;
    }

    if (description !== undefined) {
      category.description = description ? description.trim() : null;
    }

    if (colorClass !== undefined) {
      category.colorClass = colorClass ? colorClass.trim() : null;
    }

    if (popularItem !== undefined) {
      category.popularItem = popularItem ? popularItem.trim() : null;
    }

    await category.save();

    res.json({
      success: true,
      message: "Kategori berhasil diperbarui",
      data: category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal memperbarui kategori",
      error: error.message,
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Kategori dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: "Kategori berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus kategori",
      error: error.message,
    });
  }
};

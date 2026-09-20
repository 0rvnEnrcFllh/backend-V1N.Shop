const { Product, Category } = require("../models");
const { Op } = require("sequelize");

// const buildProductResponse = (req, prod) => {
//   const product =
//     typeof prod.toJSON === "function" ? prod.toJSON() : { ...prod };
//   if (product.photo) {
//     product.photoUrl = `${req.protocol}://${req.get("host")}/products/${product.id}/photo`;
//   } else {
//     product.photoUrl = null;
//   }
//   delete product.photo;
//   return product;
// };

const buildProductResponse = (req, prod) => {
  const product =
    typeof prod.toJSON === "function" ? prod.toJSON() : { ...prod };
  if (product.photo) {
    const version = product.updatedAt
      ? new Date(product.updatedAt).getTime()
      : 0;
    product.photoUrl = `${req.protocol}://${req.get("host")}/products/${product.id}/photo?v=${version}`;
  } else {
    product.photoUrl = null;
  }
  delete product.photo;
  return product;
};

const decodePhoto = (photoInput) => {
  if (!photoInput) return null;
  const parts = photoInput.split(",");
  const raw = parts.length > 1 ? parts[1] : parts[0];
  return Buffer.from(raw, "base64");
};

exports.getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      categoryName,
      categoryId,
      tag,
      minPrice,
      maxPrice,
      minRating,
      page = 1,
      limit = 10,
      sortBy = "id",
      sortOrder = "DESC",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (search) {
      const searchClause = { [Op.iLike ? Op.iLike : Op.like]: `%${search}%` };
      where[Op.or] = [
        { name: searchClause },
        { description: searchClause },
        { tag: searchClause },
        { category: searchClause },
        { categoryName: searchClause },
      ];
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }

    if (category) {
      where[Op.or] = [
        { category: category },
        { category: { [Op.iLike ? Op.iLike : Op.like]: `%${category}%` } },
      ];
    }

    if (categoryName) {
      where.categoryName = {
        [Op.iLike ? Op.iLike : Op.like]: `%${categoryName}%`,
      };
    }

    if (tag) {
      where.tag = { [Op.iLike ? Op.iLike : Op.like]: `%${tag}%` };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (minRating) {
      where.rating = { [Op.gte]: parseFloat(minRating) };
    }

    const validSortFields = [
      "id",
      "name",
      "price",
      "stock",
      "rating",
      "reviews",
      "createdAt",
    ];
    const actualSortField = validSortFields.includes(sortBy) ? sortBy : "id";
    const actualSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { count, rows: prods } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: "categoryRef",
          attributes: ["id", "name", "slug", "icon", "colorClass"],
        },
      ],
      limit: limitNum,
      offset: offset,
      order: [[actualSortField, actualSortOrder]],
    });

    res.json({
      success: true,
      message: "Berhasil mengambil daftar produk",
      data: prods.map((prod) => buildProductResponse(req, prod)),
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar produk",
      error: error.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const prod = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: "categoryRef",
          attributes: ["id", "name", "slug", "icon", "colorClass"],
        },
      ],
    });

    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Produk dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    res.json({
      success: true,
      message: "Berhasil mengambil detail produk",
      data: buildProductResponse(req, prod),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail produk",
      error: error.message,
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      categoryName,
      categoryId,
      price,
      rating,
      reviews,
      stock,
      tag,
      description,
      photo,
      photoMime,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nama produk dan harga wajib diisi",
      });
    }

    let resolvedCategoryId = categoryId ? parseInt(categoryId, 10) : null;
    let resolvedCategory = category ? category.toString().trim() : null;
    let resolvedCategoryName = categoryName
      ? categoryName.toString().trim()
      : null;

    // Auto-resolve category relations if categoryId or category/slug is given
    if (resolvedCategoryId) {
      const catObj = await Category.findByPk(resolvedCategoryId);
      if (catObj) {
        if (!resolvedCategory)
          resolvedCategory = catObj.slug || catObj.name.toLowerCase();
        if (!resolvedCategoryName) resolvedCategoryName = catObj.name;
      }
    } else if (resolvedCategory) {
      const catObj = await Category.findOne({
        where: {
          [Op.or]: [
            { slug: resolvedCategory },
            { name: { [Op.iLike ? Op.iLike : Op.like]: resolvedCategory } },
          ],
        },
      });
      if (catObj) {
        resolvedCategoryId = catObj.id;
        if (!resolvedCategoryName) resolvedCategoryName = catObj.name;
      }
    } else if (resolvedCategoryName) {
      const catObj = await Category.findOne({
        where: {
          name: { [Op.iLike ? Op.iLike : Op.like]: resolvedCategoryName },
        },
      });
      if (catObj) {
        resolvedCategoryId = catObj.id;
        if (!resolvedCategory)
          resolvedCategory = catObj.slug || catObj.name.toLowerCase();
      }
    }

    const payload = {
      name: name.trim(),
      category: resolvedCategory,
      categoryName: resolvedCategoryName,
      categoryId: resolvedCategoryId,
      price: parseFloat(price),
      rating: rating !== undefined ? parseFloat(rating) : 0,
      reviews: reviews !== undefined ? parseInt(reviews, 10) : 0,
      stock: stock !== undefined ? parseInt(stock, 10) : 0,
      tag: tag ? tag.toString().trim() : null,
      description: description ? description.toString().trim() : null,
    };

    if (req.file) {
      payload.photo = req.file.buffer;
      payload.photoMime = req.file.mimetype;
    } else if (photo && !/^https?:\/\//i.test(photo)) {
      payload.photo = decodePhoto(photo);
      payload.photoMime = photoMime || "image/jpeg";
    }

    const prod = await Product.create(payload);
    const createdProd = await Product.findByPk(prod.id, {
      include: [
        {
          model: Category,
          as: "categoryRef",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan",
      data: buildProductResponse(req, createdProd),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal menambahkan produk baru",
      error: error.message,
    });
  }
};

exports.getProductPhoto = async (req, res) => {
  try {
    const prod = await Product.findByPk(req.params.id);
    if (!prod || !prod.photo) {
      return res.status(404).json({
        success: false,
        message: "Foto produk tidak ditemukan",
      });
    }

    res.set("Content-Type", prod.photoMime || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(prod.photo);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil gambar produk",
      error: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const prod = await Product.findByPk(req.params.id);
    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Produk dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    const {
      name,
      category,
      categoryName,
      categoryId,
      price,
      rating,
      reviews,
      stock,
      tag,
      description,
      photo,
      photoMime,
    } = req.body;

    if (categoryId !== undefined) {
      if (categoryId) {
        const catObj = await Category.findByPk(categoryId);
        if (catObj) {
          prod.categoryId = catObj.id;
          if (category === undefined)
            prod.category = catObj.slug || catObj.name.toLowerCase();
          if (categoryName === undefined) prod.categoryName = catObj.name;
        }
      } else {
        prod.categoryId = null;
      }
    }

    if (name !== undefined) prod.name = name.trim();
    if (category !== undefined)
      prod.category = category ? category.toString().trim() : null;
    if (categoryName !== undefined)
      prod.categoryName = categoryName ? categoryName.toString().trim() : null;
    if (price !== undefined) prod.price = parseFloat(price);
    if (rating !== undefined) prod.rating = parseFloat(rating);
    if (reviews !== undefined) prod.reviews = parseInt(reviews, 10);
    if (stock !== undefined) prod.stock = parseInt(stock, 10);
    if (tag !== undefined) prod.tag = tag ? tag.toString().trim() : null;
    if (description !== undefined)
      prod.description = description ? description.toString().trim() : null;

    if (req.file) {
      prod.photo = req.file.buffer;
      prod.photoMime = req.file.mimetype;
    } else if (photo && !/^https?:\/\//i.test(photo)) {
      prod.photo = decodePhoto(photo);
      prod.photoMime = photoMime || "image/jpeg";
    }

    await prod.save();

    const updatedProd = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: "categoryRef",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: buildProductResponse(req, updatedProd),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal memperbarui produk",
      error: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const prod = await Product.findByPk(req.params.id);
    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Produk dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    await prod.destroy();

    res.json({
      success: true,
      message: "Produk berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus produk",
      error: error.message,
    });
  }
};

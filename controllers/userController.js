const { User, Role } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");

exports.getUsers = async (req, res) => {
  try {
    const { search, roleId, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike ? Op.iLike : Op.like]: `%${search}%` } },
        { email: { [Op.iLike ? Op.iLike : Op.like]: `%${search}%` } },
      ];
    }

    const roleInclude = {
      model: Role,
      as: "roles",
      attributes: ["id", "name"],
      through: { attributes: [] },
    };

    if (roleId) {
      roleInclude.where = { id: parseInt(roleId, 10) };
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: ["id", "name", "email", "isActive", "createdAt", "updatedAt"],
      include: [roleInclude],
      limit: limitNum,
      offset: offset,
      order: [["id", "DESC"]],
      distinct: true,
    });

    res.json({
      success: true,
      message: "Berhasil mengambil daftar pengguna (users)",
      data: users,
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
      message: "Gagal mengambil data users",
      error: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "name", "email", "isActive", "createdAt", "updatedAt"],
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    res.json({
      success: true,
      message: "Berhasil mengambil detail user",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail user",
      error: error.message,
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, roleIds, isActive = true } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar dalam sistem",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hash,
      isActive: Boolean(isActive),
    });

    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      await user.setRoles(roleIds);
    }

    const userWithRoles = await User.findByPk(user.id, {
      attributes: ["id", "name", "email", "isActive", "createdAt", "updatedAt"],
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "User berhasil dibuat",
      data: userWithRoles,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal membuat user baru",
      error: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    const { name, email, password, roleIds, isActive } = req.body;

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail && existingEmail.id !== user.id) {
        return res.status(409).json({
          success: false,
          message: "Email baru sudah digunakan oleh pengguna lain",
        });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    if (password) {
      user.password = await bcrypt.hash(password, 10);
      user.tokenVersion += 1; // Invalidate current tokens if password changed
    }

    await user.save();

    if (roleIds && Array.isArray(roleIds)) {
      await user.setRoles(roleIds);
    }

    const updatedUser = await User.findByPk(user.id, {
      attributes: ["id", "name", "email", "isActive", "createdAt", "updatedAt"],
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    res.json({
      success: true,
      message: "Data user berhasil diperbarui",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal memperbarui data user",
      error: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: "User berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus user",
      error: error.message,
    });
  }
};

const { Role, User } = require("../models");

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id", "name", "email"],
          through: { attributes: [] },
        },
      ],
      order: [["id", "ASC"]],
    });

    const formattedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      userCount: role.users ? role.users.length : 0,
      users: role.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    res.json({
      success: true,
      message: "Berhasil mengambil daftar peran (roles)",
      data: formattedRoles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data roles",
      error: error.message,
    });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id", "name", "email", "isActive"],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Role dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    res.json({
      success: true,
      message: "Berhasil mengambil detail role",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail role",
      error: error.message,
    });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nama role wajib diisi",
      });
    }

    const existingRole = await Role.findOne({
      where: { name: name.trim() },
    });

    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: `Role dengan nama "${name}" sudah ada`,
      });
    }

    const role = await Role.create({
      name: name.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Role baru berhasil dibuat",
      data: role,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal membuat role baru",
      error: error.message,
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nama role wajib diisi",
      });
    }

    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Role dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    const existingOther = await Role.findOne({
      where: { name: name.trim() },
    });

    if (existingOther && existingOther.id !== parseInt(req.params.id, 10)) {
      return res.status(409).json({
        success: false,
        message: `Role dengan nama "${name}" sudah digunakan`,
      });
    }

    role.name = name.trim();
    await role.save();

    res.json({
      success: true,
      message: "Role berhasil diperbarui",
      data: role,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal memperbarui role",
      error: error.message,
    });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [{ model: User, as: "users" }],
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Role dengan ID ${req.params.id} tidak ditemukan`,
      });
    }

    await role.destroy();

    res.json({
      success: true,
      message: "Role berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus role",
      error: error.message,
    });
  }
};

const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");
require("dotenv").config();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message:
          "Akses ditolak. Token Authorization (Bearer token) tidak ditemukan.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Format token tidak valid",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "rahasia_jwt");

    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User dengan token ini tidak ditemukan",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Akun belum aktif. Silakan verifikasi email Anda terlebih dahulu.",
      });
    }

    // Check token version if encoded in token
    if (
      decoded.tokenVersion !== undefined &&
      decoded.tokenVersion !== user.tokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Sesi token telah berakhir atau user telah logout. Silakan login kembali.",
      });
    }

    req.user = user;
    req.userId = user.id;
    req.userRoles = user.roles ? user.roles.map((r) => r.name) : [];
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token telah kadaluarsa. Silakan login kembali.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Token tidak valid atau terjadi kesalahan autentikasi",
    });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi diperlukan",
      });
    }

    if (allowedRoles.length === 0) return next();

    const userRoles = req.userRoles || [];
    const hasRole = allowedRoles.some((role) =>
      userRoles.map((r) => r.toLowerCase()).includes(role.toLowerCase()),
    );

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Endpoint ini membutuhkan peran: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorize = authorize;

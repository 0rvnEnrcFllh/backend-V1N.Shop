const { User, Role } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../utils/emailService");
require("dotenv").config();

const getBaseUrl = (req) => {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (req) return `${req.protocol}://${req.get("host")}`;
  return `http://localhost:${process.env.PORT || 3000}`;
};

const getExpiresInOption = () => {
  const raw = (process.env.JWT_EXPIRES_IN || "24h").toString().trim();
  if (/^\d+[smhdwqy]?$/i.test(raw)) {
    return raw;
  }
  return "24h";
};

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, roleIds } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan kata sandi wajib diisi",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Kata sandi minimal 6 karakter",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email sudah terdaftar. Silakan login atau gunakan email lain.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const activationToken = crypto.randomBytes(24).toString("hex");

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
      isActive: false,
      activationToken,
      tokenVersion: 0,
    });

    // Safely assign roles
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      const validRoles = await Role.findAll({ where: { id: roleIds } });
      if (validRoles.length > 0) {
        await user.setRoles(validRoles.map((r) => r.id));
      } else {
        const [defaultRole] = await Role.findOrCreate({
          where: { name: "User" },
        });
        await user.setRoles([defaultRole.id]);
      }
    } else {
      const [defaultRole] = await Role.findOrCreate({
        where: { name: "User" },
      });
      await user.setRoles([defaultRole.id]);
    }

    const activationUrl = `${getBaseUrl(req)}/api/auth/activate?token=${activationToken}`;

    // Attempt sending email asynchronously without blocking registration
    sendEmail({
      to: user.email,
      name: user.name,
      subject: "Aktivasi Akun Anda",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2563eb;">Selamat Datang, ${user.name}!</h2>
                    <p>Terima kasih telah mendaftar di sistem kami. Klik tombol di bawah untuk mengaktifkan akun Anda:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${activationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Aktivasi Akun</a>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">Atau salin tautan berikut ke browser Anda:<br><a href="${activationUrl}">${activationUrl}</a></p>
                </div>
            `,
      text: `Halo ${user.name},\n\nTerima kasih telah mendaftar. Silakan klik tautan berikut untuk mengaktifkan akun Anda:\n${activationUrl}`,
    }).catch((err) => console.error("Email error:", err));

    const userResponse = await User.findByPk(user.id, {
      attributes: ["id", "name", "email", "isActive", "createdAt"],
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
      message:
        "Registrasi berhasil. Silakan periksa email Anda untuk melakukan aktivasi akun.",
      data: userResponse,
      activationUrl: activationUrl,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal melakukan registrasi",
      error: error.message,
    });
  }
};

// Activate account
exports.activate = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token aktivasi tidak disertakan",
      });
    }

    const user = await User.findOne({
      where: { activationToken: token },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token aktivasi tidak valid atau akun sudah aktif",
      });
    }

    user.isActive = true;
    user.activationToken = null;
    await user.save();

    if (req.accepts("html") && !req.xhr && !req.accepts("json")) {
      return res.send(`
                <html>
                    <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
                        <div style="background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 420px;">
                            <h2 style="color: #4ade80; margin-top: 0;">Akun Berhasil Diaktifkan!</h2>
                            <p style="color: #94a3b8;">Akun Anda kini sudah aktif dan siap digunakan. Anda dapat login melalui API atau antarmuka aplikasi.</p>
                            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">Buka API Tester</a>
                        </div>
                    </body>
                </html>
            `);
    }

    res.json({
      success: true,
      message: "Akun berhasil diaktifkan. Anda sekarang dapat login.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengaktifkan akun",
      error: error.message,
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan kata sandi wajib diisi",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      where: { email: normalizedEmail },
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
      return res.status(401).json({
        success: false,
        message: "Email atau kata sandi tidak cocok",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Email atau kata sandi tidak cocok",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Akun belum diaktifkan. Silakan periksa email aktivasi Anda atau lakukan aktivasi.",
        activationToken: user.activationToken,
      });
    }

    const token = jwt.sign(
      { id: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET || "rahasia_jwt",
      { expiresIn: getExpiresInOption() },
    );

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      roles: user.roles,
    };

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        token,
        user: userData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal melakukan login",
      error: error.message,
    });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
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
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Berhasil mengambil profil pengguna saat ini",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data user",
      error: error.message,
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna dengan email tersebut tidak ditemukan",
      });
    }

    const resetToken = crypto.randomBytes(24).toString("hex");
    const resetPasswordExpiry = new Date(Date.now() + 3600000); // 1 hour

    user.resetToken = resetToken;
    user.resetPasswordExpiry = resetPasswordExpiry;
    await user.save();

    const resetUrl = `${getBaseUrl(req)}/api/auth/reset-password?token=${resetToken}`;

    sendEmail({
      to: user.email,
      name: user.name,
      subject: "Permintaan Reset Kata Sandi",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2563eb;">Reset Kata Sandi</h2>
                    <p>Halo ${user.name},</p>
                    <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Klik tombol di bawah ini untuk mengatur kata sandi baru:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Kata Sandi</a>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">Tautan ini hanya berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.</p>
                </div>
            `,
      text: `Halo ${user.name},\n\nAnda meminta reset kata sandi. Silakan gunakan tautan berikut:\n${resetUrl}`,
    }).catch((err) => console.error("Email error:", err));

    res.json({
      success: true,
      message: "Tautan reset kata sandi telah dikirim ke email Anda.",
      resetUrl: resetUrl,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memproses permintaan reset kata sandi",
      error: error.message,
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;
    const { newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token reset kata sandi wajib disertakan",
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Kata sandi baru wajib diisi dan minimal 6 karakter",
      });
    }

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetPasswordExpiry: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token reset kata sandi tidak valid atau telah kadaluarsa",
      });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    user.resetToken = null;
    user.resetPasswordExpiry = null;
    user.tokenVersion += 1;
    await user.save();

    res.json({
      success: true,
      message: "Kata sandi berhasil diperbarui. Silakan login kembali.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui kata sandi",
      error: error.message,
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    user.tokenVersion += 1;
    await user.save();

    res.json({
      success: true,
      message: "Logout berhasil. Sesi token telah dinonaktifkan.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal melakukan logout",
      error: error.message,
    });
  }
};

const router = require("express").Router();
const {
  register,
  login,
  activate,
  getMe,
  forgotPassword,
  resetPassword,
  logout,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/activate", activate);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

module.exports = router;

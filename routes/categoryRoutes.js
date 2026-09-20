const router = require("express").Router();
const cc = require("../controllers/categoryController");
const { authenticate, authorize } = require("../middleware/auth");

// Authenticated endpoints
router.use(authenticate);

router.get("/", cc.getCategories);
router.get("/:id", cc.getCategoryById);
router.post("/", authorize("Admin"), cc.createCategory);
router.put("/:id", authorize("Admin"), cc.updateCategory);
router.delete("/:id", authorize("Admin"), cc.deleteCategory);

module.exports = router;

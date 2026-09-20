const router = require("express").Router();
const pc = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/auth");
const multer = require("multer");

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Photo access is public/open for image rendering or behind auth
router.get("/:id/photo", pc.getProductPhoto);

// Authenticated endpoints
router.use(authenticate);

router.get("/", pc.getProducts);
router.get("/:id", pc.getProductById);
router.post("/", authorize("admin"), upload.single("photo"), pc.createProduct);
router.put(
  "/:id",
  authorize("admin"),
  upload.single("photo"),
  pc.updateProduct,
);
router.delete("/:id", authorize("admin"), pc.deleteProduct);

module.exports = router;

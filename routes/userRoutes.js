const router = require("express").Router();
const uc = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", uc.getUsers);
router.get("/:id", uc.getUserById);
router.post("/", uc.createUser);
router.put("/:id", uc.updateUser);
router.delete("/:id", uc.deleteUser);

module.exports = router;

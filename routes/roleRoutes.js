const router = require("express").Router();
const rc = require("../controllers/roleController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", rc.getRoles);
router.get("/:id", rc.getRoleById);
router.post("/", rc.createRole);
router.put("/:id", rc.updateRole);
router.delete("/:id", rc.deleteRole);

module.exports = router;

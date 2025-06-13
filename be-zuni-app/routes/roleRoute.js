const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.post("/", roleController.createRole);
router.get("/", roleController.getRoles);
router.put("/", roleController.updateRole);
router.delete("/:id", roleController.deleteRole);

module.exports = router;

const { Router } = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  getUser,
  ChangeAvatar,
  editUser,
  getAuthors,
} = require("../controller/userController");

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/:id", getUser);
router.get("/", getAuthors);
router.post("/change-avatar", authMiddleware, ChangeAvatar);
router.patch("/edit-user", authMiddleware, editUser);

module.exports = router;

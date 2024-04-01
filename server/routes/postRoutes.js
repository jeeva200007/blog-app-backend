const { Router } = require("express");
const {
  createPost,
  getPost,
  getPosts,
  getCatPosts,
  getUserPosts,
  editPost,
  deletePost,
} = require("../controller/postController");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.post("/", authMiddleware, createPost);
router.get("/", getPosts);
router.get("/:id", getPost);
router.patch("/:id", authMiddleware, editPost);
router.get("/categories/:category", getCatPosts);
router.get("/users/:id", getUserPosts);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;

const Post = require("../models/postModel");
const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");

const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");

/* ========= CREATE A POST
// POST: api/posts
//protected
*/

const createPost = async (req, res, next) => {
  try {
    let { title, category, description } = req.body;
    if (!title || !category || !description || !req.files) {
      return next(new HttpError("Fill all the fields", 422));
    }

    const { thumbnail } = req.files;
    // check file size
    if (thumbnail.size > 2000000) {
      return next(
        new HttpError("Thumbnail too big. File should be less than 2mb")
      );
    }

    let filename = thumbnail.name;
    let splittedFilename = filename.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];
    thumbnail.mv(
      path.join(__dirname, "..", "/uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        } else {
          const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newFilename,
            creator: req.user.id,
          });
          if (!newPost) {
            return next(new HttpError("Post couldn't created", 422));
          }
          // find user and increase post count by 1
          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

          res.status(201).json(newPost);
        }
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* ========= GET ALL POST
// GET: api/posts
//Unprotected
*/

const getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ updateAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* ========= GET single POST
// GET: api/posts/:id
//unprotected 
*/

const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* ========= get POSTs by CATEGORY
// GET: api/posts/categories/:category
//unprotected
*/

const getCatPosts = async (req, res, next) => {
  try {
    const { category } = req.params;
    const catPosts = await Post.find({ category }).sort({ createdAt: -1 });
    res.status(200).json(catPosts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* ========= GET AUTHOR POST
// GET: api/posts/users/:id
//unprotected
*/

const getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* ========= 
// PATCH: api/posts/users/:id
//protected
*/
const editPost = async (req, res, next) => {
  try {
    let fileName;
    let newFileName;
    let updatedPost;
    const postId = req.params.id;
    let { title, category, description } = req.body;

    // ReactQuill has a para opening and closing tag with break tag in btw so there are 11 charac in there already

    if (!title || !category || !description.length) {
      return next(new HttpError("Fill all the fields", 422));
    }
    if (!req.files) {
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { title, category, description },
        { new: true }
      );
    } else {
      // get old posts from database
      const oldPost = await Post.findById(postId);
      // delete old thumbnail from upload
      fs.unlink(
        path.join(__dirname, "..", "uploads", oldPost.thumbnail),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          }
        }
      );
      // upload new thumbnail
      const { thumbnail } = req.files;
      // check size
      if (thumbnail.size > 2000000) {
        return next(
          new HttpError("Thumbnail too big. Should be less thsn 2mb")
        );
      }
      fileName = thumbnail.name;
      let splittedFilename = fileName.split(".");
      newFileName =
        splittedFilename[0] +
        uuid() +
        "." +
        splittedFilename[splittedFilename.length - 1];
      thumbnail.mv(
        path.join(__dirname, "..", "/uploads", newFileName),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          }
        }
      );
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { title, category, description, thumbnail: newFileName },
        { new: true }
      );
    }
    if (!updatedPost) {
      return next(new HttpError("Couldn't update post.", 400));
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError(error));
  }
};
/* ========= 
// DELETE: api/posts/users/:id
//protected
*/
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError("Post unavailable.", 400));
    }
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }
    const fileName = post.thumbnail;
    if (!fileName) {
      // If thumbnail doesn't exist, just delete the post and return
      await Post.findByIdAndDelete(postId);
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.posts > 0) {
        const userPostCount = currentUser.posts - 1;
        await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
      }
      return res.status(200).json({ message: "Post deleted successfully." });
    }
    // delete thumbnail from upload folder
    fs.unlink(path.join(__dirname, "..", "uploads", fileName), async (err) => {
      if (err) {
        return next(new HttpError(err));
      } else {
        await Post.findByIdAndDelete(postId);
        const currentUser = await User.findById(req.user.id);
        if (currentUser && currentUser.posts > 0) {
          const userPostCount = currentUser.posts - 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
        }
        return res
          .status(200)
          .json({ message: "Post and thumbnail deleted successfully." });
      }
    });
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  createPost,
  getPost,
  getPosts,
  getCatPosts,
  getUserPosts,
  editPost,
  deletePost,
};

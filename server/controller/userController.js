const User = require("../models/userModel");
const HttpError = require("../models/errorModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

/* REGISTER NEW USER
POST: api/users/register
*/

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;
    if (!name || !email || !password || !password2) {
      return next(new HttpError("Fill all the fields.", 422));
    }
    const newEmail = email.toLowerCase();
    const emailExists = await User.findOne({ email: newEmail });

    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }

    if (password.trim().length < 6) {
      return next(new HttpError("password should atleast 6 characters.", 422));
    }

    if (password !== password2) {
      return next(new HttpError("password do not match"));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPass,
    });
    res.status(201).json(`New user ${newUser.email} registered.`);
  } catch (error) {
    return next(new HttpError("User registration failed.", 422));
  }
};

/* LOGIN USER
POST: api/users/login
*/

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError("Fill all the fields", 422));
    }

    const newEmail = email.toLowerCase();
    const user = await User.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError("Invalid login id or password.", 422));
    }

    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError("Invalid login id or password.", 422));
    }

    const { _id: id, name } = user;
    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1hr",
    });
    //  const refreshToken = jwt.sign({ id, name }, process.env.REFESH_TOKEN, {
    //   expiresIn: "1hr",
    // });

    // res.cookie("jwt", refreshToken, {
    //   httpOnly: true,
    //   sameSite: "None",
    //   secure: true,
    //   maxAge: 24 * 60 * 60 * 1000,
    // });

    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError("Login failed. Please check your email and password.", 422)
    );
  }
};

/*  USER PROFILE
POST: api/users/:id
*/

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return next(new HttpError("user not found.", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* CHANGE USER AVATAR(profile pic)
POST: api/users/change-avatar
*/
const ChangeAvatar = async (req, res, next) => {
  try {
    if (!req.files || !req.files.avatar) {
      return next(new HttpError("Please choose an image.", 422));
    }

    const avatar = req.files.avatar;

    if (avatar.size > 500000) {
      return next(
        new HttpError("Profile picture too big. Should be less than 500kb", 422)
      );
    }

    const user = await User.findById(req.user.id);

    // Delete old avatar if exists
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, "..", "uploads", user.avatar);
      console.log("Old Avatar Path:", oldAvatarPath);
      fs.unlink(oldAvatarPath, (err) => {
        if (err) {
          // Log the error for debugging
          console.error("Error deleting old avatar:", err);
          // Continue with the upload even if deletion fails
        }
      });
    }

    let fileName = avatar.name;
    let splittedFileName = fileName.split(".");
    let newFileName =
      splittedFileName[0] +
      uuid() +
      "." +
      splittedFileName[splittedFileName.length - 1];

    avatar.mv(
      path.join(__dirname, "..", "uploads", newFileName),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        }
        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFileName },
          { new: true }
        );
        if (!updatedAvatar) {
          return next(new HttpError("Avatar couldn't be changed.", 422));
        }
        res.status(200).json(updatedAvatar);
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* EDIT USER DETAILS(from profile)
POST: api/users/edit-user
*/

const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPass, newPass, confirmNewPass } = req.body;
    if (!name || !email || !currentPass || !newPass) {
      return next(new HttpError("Fill all the field.", 422));
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found.", 404));
    }
    //  make sure new email dosent exists already

    const emailExists = await User.findOne({ email });
    if (emailExists && emailExists._id !== req.user.id) {
      return next(new HttpError("Email already exist.", 422));
    }
    // compare current password to database password
    const validateUserPassword = await bcrypt.compare(
      currentPass,
      user.password
    );
    if (!validateUserPassword) {
      return next(new HttpError("Invalid current password", 422));
    }
    // compare new passwords
    if (newPass !== confirmNewPass) {
      return next(new HttpError("New password doesn't match", 422));
    }
    // hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPass, salt);

    // update user info in database

    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );
    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error));
  }
};

/* Get authors
POST: api/users/authors
*/

const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("-password");
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  ChangeAvatar,
  editUser,
  getAuthors,
};

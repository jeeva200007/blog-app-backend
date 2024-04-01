const express = require("express");
const PORT = 5001 || process.env.PORT;
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const upload = require("express-fileupload");
const url = process.env.MONGO_URI;
const userRoutes = require("../server/routes/userRoutes");
const postRoutes = require("../server/routes/postRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);
app.use(upload());
app.use("/uploads", express.static(__dirname + "/uploads"));

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

app.use(notFound);
app.use(errorHandler);

////////////////////////////////////////////////////////////////
const connectDB = async () => {
  try {
    await mongoose.connect(url);
    console.log(`mongodb connected`);
  } catch (err) {
    console.log("error connection", err.message);
  }
};

connectDB();

app.listen(PORT, () => {
  console.log(`server connected to port ${PORT}`);
});

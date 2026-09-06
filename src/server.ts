import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";

import {
  productRouter,
  orderRouter,
  userRouter,
  authRouter,
} from "./dependency-injection.js";

const app = express();

app.use(express.json());

// Middleware
app.use((req, res, next) => {
  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "E-commerce API is running",
  });
});

app.use("/products", productRouter);
app.use("/orders", orderRouter);
app.use("/users", userRouter);
app.use(authRouter);

// 404
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// 500
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: "Internal Server Error",
  });
};

app.use(errorHandler);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

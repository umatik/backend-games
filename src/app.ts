import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";

import {
  productRouter,
  orderRouter,
  userRouter,
  authRouter,
} from "./dependency-injection.js";
import { AppError } from "./errors/app.error.js";

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
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });

    return;
  }

  res.status(500).json({
    message: "Internal Server Error",
  });
};

app.use(errorHandler);

export default app;

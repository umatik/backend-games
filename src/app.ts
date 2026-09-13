import helmet from "helmet";
import "dotenv/config";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";

import {
  productRouter,
  orderRouter,
  userRouter,
  authRouter,
} from "./dependency-injection.js";
import { AppError } from "./errors/app.error.js";

const app = express();
app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "1mb" }));

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
  if (err?.type === "entity.too.large") {
    res.status(413).json({
      message: "Request body too large",
    });

    return;
  }

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

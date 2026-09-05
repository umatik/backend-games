import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";

import { createProductRouter } from "./routes/product.routes.js";
import { ProductController } from "./controllers/product.controller.js";
import { ProductService } from "./services/product.service.js";
import { PostgresProductRepository } from "./repositories/postgres-product.repository.js";

import { createOrderRouter } from "./routes/order.routes.js";
import { OrderController } from "./controllers/order.controller.js";
import { OrderService } from "./services/order.service.js";
import { PostgresOrderRepository } from "./repositories/postgres-order.repository.js";

import { createAuthRouter } from "./routes/auth.routes.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AuthService } from "./services/auth.service.js";
import { PostgresAuthRepository } from "./repositories/postgres-auth.repository.js";
import { JwtService } from "./services/jwt.service.js";

const productRepository = new PostgresProductRepository();
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);
const productRouter = createProductRouter(productController);

const orderRepository = new PostgresOrderRepository();
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);
const orderRouter = createOrderRouter(orderController);

const authRepository = new PostgresAuthRepository();
const jwtService = new JwtService();
const authService = new AuthService(authRepository, jwtService);
const authController = new AuthController(authService);
const authRouter = createAuthRouter(authController);

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

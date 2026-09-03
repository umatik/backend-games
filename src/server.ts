import express, { type ErrorRequestHandler } from "express";
import { createProductRouter } from "./routes/product.routes.js";
import { ProductController } from "./controllers/product.controller.js";
import { ProductService } from "./services/product.service.js";
import { PostgresProductRepository } from "./repositories/postgres-product.repository.js";

const productRepository = new PostgresProductRepository();
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

const productRouter = createProductRouter(productController);

const app = express();

app.use(express.json());

// Middleware
app.use((req, res, next) => {
  // console.log("1. Logger middleware");
  // console.log("BODY:", req.body);

  next();
});

app.get("/", (req, res) => {
  console.log(req.method);
  console.log(req.url);
  console.log(req.headers);

  res.json({
    message: "E-commerce API is running",
  });
});

app.use("/products", productRouter);

app.get("/error", (req, res) => {
  throw new Error("Something went wrong");
});

// 404
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

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

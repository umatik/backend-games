import express, { type ErrorRequestHandler } from "express";

const app = express();

app.use(express.json());

// Middleware
app.use((req, res, next) => {
  console.log("1. Logger middleware");
  console.log("BODY:", req.body);

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

app.get("/products/:id", (req, res) => {
  console.log(req.params);

  res.json({
    productId: req.params.id,
  });
});

app.get("/products", (req, res) => {
  console.log(req.query);

  res.json({
    query: req.query,
  });
});

// 201, 400
app.post("/products", (req, res) => {
  console.log("2. POST /products");
  console.log(req.body);

  const { name, price } = req.body;

  if (!name || typeof price !== "number" || Number.isNaN(price) || price < 0) {
    res.status(400).json({
      message: "Name and price are required",
    });

    return;
  }

  res.status(201).json({
    message: "Product created",
    product: {
      name,
      price,
    },
  });
});

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

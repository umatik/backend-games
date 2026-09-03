import type { Request, Response } from "express";
import type { CreateProductData } from "../types/product.types.js";
import { ProductService } from "../services/product.service.js";

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  getProduct = (req: Request, res: Response) => {
    console.log(req.params);

    res.json({
      productId: req.params.id,
    });
  };

  getProducts = (req: Request, res: Response) => {
    console.log(req.query);

    res.json({
      query: req.query,
    });
  };

  createProduct = (req: Request, res: Response) => {
    console.log("2. POST /products");
    console.log(req.body);

    const { name, price } = req.body;

    if (
      !name ||
      typeof price !== "number" ||
      Number.isNaN(price) ||
      price < 0
    ) {
      res.status(400).json({
        message: "Name and price are required",
      });

      return;
    }

    const productData: CreateProductData = { name, price };
    const product = this.productService.createProduct(productData);

    res.status(201).json({
      message: "Product created",
      product,
    });
  };
}

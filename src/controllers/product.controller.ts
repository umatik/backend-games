import type { Request, Response } from "express";
import type {
  CreateProductData,
  UpdateProductData,
} from "../types/product.types.js";
import { ProductService } from "../services/product.service.js";

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  getProducts = async (req: Request, res: Response) => {
    const products = await this.productService.getAllProducts();

    res.status(200).json({
      message: "Products found",
      product: products,
    });
  };

  getProduct = async (req: Request, res: Response) => {
    const product = await this.productService.getProduct(
      req.params.id as string,
    );

    if (!product) {
      res.status(404).json({
        message: "Product not found",
      });

      return;
    }

    res.status(200).json({
      message: "Product found",
      product,
    });
  };

  createProduct = async (req: Request, res: Response) => {
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
    const product = await this.productService.createProduct(productData);

    res.status(201).json({
      message: "Product created",
      product,
    });
  };

  updateProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, price } = req.body;

    console.log("PATCH id:", id);
    console.log("PATCH body:", req.body);

    const productData: UpdateProductData = { name, price };
    const product = await this.productService.updateProduct(id, productData);

    if (!product) {
      res.status(404).json({
        message: "Product not found",
      });

      return;
    }
    res.status(200).json({
      message: "Product updated",
      product,
    });
  };

  deleteProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const deleted = await this.productService.deleteProduct(id);

    if (!deleted) {
      res.status(404).json({
        message: "Product not found",
      });

      return;
    }

    res.status(204).send();
  };
}

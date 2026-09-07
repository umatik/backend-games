import type { Request, Response } from "express";
import type {
  CreateProductData,
  UpdateProductData,
} from "../types/product.types.js";
import { ProductService } from "../services/product.service.js";
import { isValidProductName } from "../validators/product.validator.js";

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
    const { name, variants } = req.body;

    if (!isValidProductName(name)) {
      res.status(400).json({
        message: "Invalid product name",
      });

      return;
    }

    if (!Array.isArray(variants)) {
      res.status(400).json({
        message: "Variants must be an array",
      });

      return;
    }
    const productData: CreateProductData = {
      name,
      variants,
    };

    const product = await this.productService.createProduct(productData);

    res.status(201).json({
      message: "Product created",
      product,
    });
  };

  updateProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, variants } = req.body;

    if (name === undefined && variants === undefined) {
      res.status(400).json({
        message: "At least one field is required",
      });

      return;
    }

    if (name !== undefined && !isValidProductName(name)) {
      res.status(400).json({
        message: "Name must be a non-empty string",
      });

      return;
    }

    if (variants !== undefined && !Array.isArray(variants)) {
      res.status(400).json({
        message: "Variants must be an array",
      });

      return;
    }

    const productData: UpdateProductData = {
      name,
      variants,
    };

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

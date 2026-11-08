import type { Request, Response } from "express";
import { ProductService } from "@/services/product.service.js";
import {
  createProductSchema,
  updateProductSchema,
} from "@/validators/product.validator.js";
import { ProductVariantNotFoundError } from "@/errors/product-variant-not-found.error.js";
import { parseId } from "@/validators/helpers/id.validator.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";
import { createPagination } from "@/utils/pagination.js";
import { isValidPagination } from "@/validators/helpers/pagination.validator.js";

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  getProducts = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!isValidPagination(page, limit)) {
      res.status(400).json({
        message: "Invalid pagination parameters",
      });
      return;
    }

    const { products, total } = await this.productService.getAllProducts(
      page,
      limit,
    );

    res.status(200).json({
      message: "Products found",
      products,
      pagination: createPagination(page, limit, total),
    });
  };

  getProduct = async (req: Request, res: Response) => {
    const productId = parseId(req.params.id);

    if (productId === null) {
      res.status(400).json({
        message: "Invalid product id",
      });
      return;
    }

    const product = await this.productService.getProduct(productId);
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
    const parsed = createProductSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid product data",
        errors: formatZodIssues(parsed.error),
      });

      return;
    }

    const product = await this.productService.createProduct(parsed.data);

    res.status(201).json({
      message: "Product created",
      product,
    });
  };

  updateProduct = async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    if (id === null) {
      res.status(400).json({
        message: "Invalid product id",
      });
      return;
    }

    const parsed = updateProductSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid product data",
        errors: formatZodIssues(parsed.error),
      });

      return;
    }

    try {
      const product = await this.productService.updateProduct(id, parsed.data);

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
    } catch (error) {
      if (error instanceof ProductVariantNotFoundError) {
        res.status(404).json({
          message: "Product variant not found",
        });

        return;
      }

      throw error;
    }
  };

  deleteProduct = async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    if (id === null) {
      res.status(400).json({
        message: "Invalid product id",
      });
      return;
    }

    const deleted = await this.productService.deleteProduct(id);

    if (!deleted) {
      res.status(404).json({
        message: "Product not found",
      });

      return;
    }

    res.status(204).send();
  };

  deleteProductVariant = async (req: Request, res: Response) => {
    const productId = parseId(req.params.productId);
    const variantId = parseId(req.params.variantId);

    if (productId === null || variantId === null) {
      res.status(400).json({
        message: "Product id and variant id must be positive integers",
      });

      return;
    }

    const deleted = await this.productService.deleteProductVariant(
      productId,
      variantId,
    );

    if (!deleted) {
      res.status(404).json({
        message: "Product variant not found",
      });

      return;
    }

    res.status(200).json({
      message: "Product variant deleted",
    });
  };
}

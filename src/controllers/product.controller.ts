import type { Request, Response } from "express";
import type {
  CreateProductData,
  UpdateProductData,
} from "../types/product.types.js";
import { ProductService } from "../services/product.service.js";
import {
  isValidProductName,
  isValidProductOption,
  isValidProductPrice,
  isValidProductQuantity,
  isValidProductVariantId,
} from "../validators/product.validator.js";
import { ProductVariantNotFoundError } from "../errors/product-variant-not-found.error.js";

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  getProducts = async (req: Request, res: Response) => {
    const products = await this.productService.getAllProducts();

    res.status(200).json({
      message: "Products found",
      products,
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

    for (const variant of variants) {
      if (!isValidProductOption(variant.color)) {
        res.status(400).json({
          message: "Variant color must be a non-empty string or null",
        });

        return;
      }

      if (!isValidProductOption(variant.size)) {
        res.status(400).json({
          message: "Variant size must be a non-empty string or null",
        });

        return;
      }

      if (!isValidProductPrice(variant.price)) {
        res.status(400).json({
          message: "Variant price must be a non-negative number",
        });

        return;
      }

      if (!isValidProductQuantity(variant.quantity)) {
        res.status(400).json({
          message: "Variant quantity must be a non-negative integer",
        });

        return;
      }
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

    if (variants !== undefined) {
      for (const variant of variants) {
        if (variant.id !== undefined && !isValidProductVariantId(variant.id)) {
          res.status(400).json({
            message: "Variant id must be a positive integer",
          });

          return;
        }

        if (
          variant.color !== undefined &&
          !isValidProductOption(variant.color)
        ) {
          res.status(400).json({
            message: "Variant color must be a non-empty string or null",
          });

          return;
        }

        if (variant.size !== undefined && !isValidProductOption(variant.size)) {
          res.status(400).json({
            message: "Variant size must be a non-empty string or null",
          });

          return;
        }

        if (variant.id === undefined) {
          if (!isValidProductPrice(variant.price)) {
            res.status(400).json({
              message:
                "Variant price is required and must be a non-negative number",
            });

            return;
          }

          if (!isValidProductQuantity(variant.quantity)) {
            res.status(400).json({
              message:
                "Variant quantity is required and must be a non-negative integer",
            });

            return;
          }

          continue;
        }

        if (
          variant.price !== undefined &&
          !isValidProductPrice(variant.price)
        ) {
          res.status(400).json({
            message: "Variant price must be a non-negative number",
          });

          return;
        }

        if (
          variant.quantity !== undefined &&
          !isValidProductQuantity(variant.quantity)
        ) {
          res.status(400).json({
            message: "Variant quantity must be a non-negative integer",
          });

          return;
        }
      }
    }

    const productData: UpdateProductData = {
      name,
      variants,
    };

    try {
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

  deleteProductVariant = async (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    const variantId = Number(req.params.variantId);

    if (
      !isValidProductVariantId(productId) ||
      !isValidProductVariantId(variantId)
    ) {
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

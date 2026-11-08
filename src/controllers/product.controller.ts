import type { Request, Response } from "express";
import { z } from "zod";
import { ProductService } from "@/services/product.service.js";
import {
  createProductSchema,
  createProductVariantSchema,
  productListFiltersSchema,
  productStatusSchema,
  updateProductSchema,
  updateProductVariantSchema,
} from "@/validators/product.validator.js";
import { parseId } from "@/validators/helpers/id.validator.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";
import { createPagination } from "@/utils/pagination.js";
import { isValidPagination } from "@/validators/helpers/pagination.validator.js";
import type { ProductStatus } from "@/types/product.types.js";
import { productTypes } from "@/product-types/index.js";

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  // ------------------------------------------------------------------
  // Sklep (publiczne)
  // ------------------------------------------------------------------

  getProducts = async (req: Request, res: Response) => {
    await this.listProducts(req, res, "published");
  };

  getProduct = async (req: Request, res: Response) => {
    await this.findProduct(req, res, "published");
  };

  getProductTypes = (_req: Request, res: Response) => {
    res.status(200).json({
      message: "Product types found",
      productTypes: productTypes.map((type) => ({
        key: type.key,
        productAttributes: z.toJSONSchema(type.productAttributes, { io: "input" }),
        variantAttributes: z.toJSONSchema(type.variantAttributes, { io: "input" }),
      })),
    });
  };

  // ------------------------------------------------------------------
  // Panel admina
  // ------------------------------------------------------------------

  getManagedProducts = async (req: Request, res: Response) => {
    const status = productStatusSchema.safeParse(req.query.status);

    if (!status.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: formatZodIssues(status.error).map((issue) => ({
          ...issue,
          path: "status",
        })),
      });
      return;
    }

    await this.listProducts(req, res, status.data);
  };

  getManagedProduct = async (req: Request, res: Response) => {
    await this.findProduct(req, res, "all");
  };

  createProduct = async (req: Request, res: Response) => {
    const parsed = createProductSchema.safeParse(req.body);

    if (!parsed.success) {
      this.sendInvalid(res, "Invalid product data", parsed.error);
      return;
    }

    const product = await this.productService.createProduct(parsed.data);

    res.status(201).json({
      message: "Product created",
      product,
      warnings: this.productService.getWarnings(product),
    });
  };

  updateProduct = async (req: Request, res: Response) => {
    const id = this.parseIdParam(req.params.id, res, "Invalid product id");

    if (id === null) {
      return;
    }

    const parsed = updateProductSchema.safeParse(req.body);

    if (!parsed.success) {
      this.sendInvalid(res, "Invalid product data", parsed.error);
      return;
    }

    const product = await this.productService.updateProduct(id, parsed.data);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.status(200).json({
      message: "Product updated",
      product,
      warnings: this.productService.getWarnings(product),
    });
  };

  publishProduct = async (req: Request, res: Response) => {
    const id = this.parseIdParam(req.params.id, res, "Invalid product id");

    if (id === null) {
      return;
    }

    const result = await this.productService.publishProduct(id);

    if (!result) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.status(200).json({
      message: "Product published",
      product: result.product,
      warnings: result.warnings,
    });
  };

  unpublishProduct = async (req: Request, res: Response) => {
    const id = this.parseIdParam(req.params.id, res, "Invalid product id");

    if (id === null) {
      return;
    }

    const product = await this.productService.unpublishProduct(id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.status(200).json({ message: "Product unpublished", product });
  };

  deleteProduct = async (req: Request, res: Response) => {
    const id = this.parseIdParam(req.params.id, res, "Invalid product id");

    if (id === null) {
      return;
    }

    const deleted = await this.productService.deleteProduct(id);

    if (!deleted) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.status(204).send();
  };

  // ------------------------------------------------------------------
  // Warianty
  // ------------------------------------------------------------------

  createVariant = async (req: Request, res: Response) => {
    const productId = this.parseIdParam(req.params.id, res, "Invalid product id");

    if (productId === null) {
      return;
    }

    const parsed = createProductVariantSchema.safeParse(req.body);

    if (!parsed.success) {
      this.sendInvalid(res, "Invalid product variant data", parsed.error);
      return;
    }

    const variant = await this.productService.createVariant(productId, parsed.data);

    if (!variant) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.status(201).json({ message: "Product variant created", variant });
  };

  updateVariant = async (req: Request, res: Response) => {
    const productId = parseId(req.params.id);
    const variantId = parseId(req.params.variantId);

    if (productId === null || variantId === null) {
      res.status(400).json({
        message: "Product id and variant id must be positive integers",
      });
      return;
    }

    const parsed = updateProductVariantSchema.safeParse(req.body);

    if (!parsed.success) {
      this.sendInvalid(res, "Invalid product variant data", parsed.error);
      return;
    }

    const variant = await this.productService.updateVariant(
      productId,
      variantId,
      parsed.data,
    );

    if (!variant) {
      res.status(404).json({ message: "Product variant not found" });
      return;
    }

    res.status(200).json({ message: "Product variant updated", variant });
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

  // ------------------------------------------------------------------
  // Pomocnicze
  // ------------------------------------------------------------------

  private async listProducts(req: Request, res: Response, status: ProductStatus) {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!isValidPagination(page, limit)) {
      res.status(400).json({
        message: "Invalid pagination parameters",
      });
      return;
    }

    const filters = productListFiltersSchema.safeParse(
      Object.fromEntries(
        Object.entries(req.query).filter(
          ([key]) => !["page", "limit", "status"].includes(key),
        ),
      ),
    );

    if (!filters.success) {
      this.sendInvalid(res, "Invalid query parameters", filters.error);
      return;
    }

    const { products, total } = await this.productService.getAllProducts({
      ...filters.data,
      page,
      limit,
      status,
    });

    res.status(200).json({
      message: "Products found",
      products,
      pagination: createPagination(page, limit, total),
    });
  }

  private async findProduct(req: Request, res: Response, status: ProductStatus) {
    const productId = this.parseIdParam(req.params.id, res, "Invalid product id");

    if (productId === null) {
      return;
    }

    const product = await this.productService.getProduct(productId, status);

    if (!product) {
      res.status(404).json({
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      message: "Product found",
      product,
      ...(status === "all" && {
        warnings: this.productService.getWarnings(product),
      }),
    });
  }

  private parseIdParam(
    value: string | string[] | undefined,
    res: Response,
    message: string,
  ): number | null {
    const id = parseId(value);

    if (id === null) {
      res.status(400).json({ message });
    }

    return id;
  }

  private sendInvalid(res: Response, message: string, error: z.ZodError) {
    res.status(400).json({ message, errors: formatZodIssues(error) });
  }
}

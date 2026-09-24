import type { Request, Response } from "express";

import type { ProductVariantMediaService } from "@/services/product-variant-media.service.js";

export class ProductVariantMediaController {
  constructor(
    private readonly productVariantMediaService: ProductVariantMediaService,
  ) {}

  async findByProductVariantId(req: Request, res: Response): Promise<void> {
    const productVariantId = Number(req.params.productVariantId);

    const media =
      await this.productVariantMediaService.findByProductVariantId(
        productVariantId,
      );

    res.status(200).json(media);
  }

  async findById(req: Request, res: Response): Promise<void> {
    const mediaId = Number(req.params.mediaId);

    const media = await this.productVariantMediaService.findById(mediaId);

    if (!media) {
      res.status(404).json({
        message: "Media not found",
      });

      return;
    }

    res.status(200).json(media);
  }

  async create(req: Request, res: Response): Promise<void> {
    const productVariantId = Number(req.params.productVariantId);

    const { alt, sortOrder, isPrimary } = req.body;

    const file = req.file?.buffer;
    const filename = req.file?.originalname;
    const contentType = req.file?.mimetype;

    if (!file || !filename || !contentType) {
      res.status(400).json({
        message: "File is required",
      });

      return;
    }

    const media = await this.productVariantMediaService.create(
      productVariantId,
      file,
      filename,
      contentType,
      alt ?? null,
      sortOrder,
      isPrimary,
    );

    res.status(201).json(media);
  }

  async update(req: Request, res: Response): Promise<void> {
    const mediaId = Number(req.params.mediaId);

    const { alt, sortOrder, isPrimary } = req.body;

    const media = await this.productVariantMediaService.update(
      mediaId,
      alt ?? null,
      sortOrder,
      isPrimary,
    );

    if (!media) {
      res.status(404).json({
        message: "Media not found",
      });

      return;
    }

    res.status(200).json(media);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const mediaId = Number(req.params.mediaId);

    const deleted = await this.productVariantMediaService.delete(mediaId);

    if (!deleted) {
      res.status(404).json({
        message: "Media not found",
      });

      return;
    }

    res.status(204).send();
  }
}

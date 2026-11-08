import type { Request, Response } from "express";
import { z } from "zod";
import type { RecordLookupService } from "@/services/record-lookup.service.js";
import type { LabelImage } from "@/integrations/claude/label-reader.js";
import type { AuthenticatedRequest } from "@/middleware/authentication.middleware.js";
import { parseId } from "@/validators/helpers/id.validator.js";
import { PhotoLookupError } from "@/errors/external-service.error.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Limit Claude dla jednego obrazu przesłanego jako base64. */
export const MAX_LABEL_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_LABEL_IMAGES = 2;

const catalogNumberQuerySchema = z.object({
  catalogNumber: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(255).optional(),
});

const conditionNoteSchema = z.strictObject({
  text: z.string().trim().min(1).max(1000),
});

export class RecordLookupController {
  constructor(private readonly recordLookupService: RecordLookupService) {}

  lookupByPhoto = async (req: Request, res: Response) => {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0 || files.length > MAX_LABEL_IMAGES) {
      res.status(400).json({
        message: `Send 1–${MAX_LABEL_IMAGES} label photos in the "images" field`,
      });
      return;
    }

    const images: LabelImage[] = [];

    for (const file of files) {
      const mediaType = IMAGE_TYPES.find((type) => type === file.mimetype);

      if (!mediaType) {
        res.status(400).json({ message: "Label photos must be JPEG, PNG or WebP" });
        return;
      }

      if (file.size > MAX_LABEL_IMAGE_BYTES) {
        res.status(400).json({ message: "Each label photo can be at most 5 MB" });
        return;
      }

      images.push({ data: file.buffer, mediaType });
    }

    const userId = (req as AuthenticatedRequest).user?.userId;

    try {
      const result = await this.recordLookupService.lookupByPhoto(
        images,
        userId ? Number(userId) : null,
      );

      res.status(200).json({ message: "Label read", ...result });
    } catch (error) {
      if (error instanceof PhotoLookupError) {
        // Zdjęcia są zapisane, więc kreator może przejść do formularza ręcznego z tym zdjęciem.
        res.status(error.statusCode).json({
          message: error.message,
          photoUploadIds: error.photoUploadIds,
        });
        return;
      }

      throw error;
    }
  };

  lookupByCatalogNumber = async (req: Request, res: Response) => {
    const parsed = catalogNumberQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    const candidates = await this.recordLookupService.lookupByCatalogNumber(
      parsed.data.catalogNumber,
      parsed.data.label,
    );

    res.status(200).json({ message: "Releases found", candidates });
  };

  getReleaseDraft = async (req: Request, res: Response) => {
    const releaseId = parseId(req.params.releaseId);

    if (releaseId === null) {
      res.status(400).json({ message: "Invalid release id" });
      return;
    }

    const draft = await this.recordLookupService.getReleaseDraft(releaseId);

    if (!draft) {
      res.status(404).json({ message: "Release not found on Discogs" });
      return;
    }

    res.status(200).json({ message: "Release found", draft });
  };

  translateConditionNote = async (req: Request, res: Response) => {
    const parsed = conditionNoteSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid condition note",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    const conditionNote = await this.recordLookupService.translateConditionNote(
      parsed.data.text,
    );

    res.status(200).json({ message: "Condition note translated", conditionNote });
  };
}

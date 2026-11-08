import type { Response } from "express";
import { z } from "zod";
import type { SettingsService } from "@/services/settings.service.js";
import type { SettingsIntegrationProvider } from "@/integrations/integration-provider.js";
import type { AuthenticatedRequest } from "@/middleware/authentication.middleware.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";

const updateSettingsSchema = z.strictObject({
  values: z
    .record(z.string(), z.unknown())
    .refine((values) => Object.keys(values).length > 0, {
      message: "At least one setting is required",
    }),
});

export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly integrations: SettingsIntegrationProvider,
  ) {}

  getSettings = async (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      message: "Settings found",
      settings: await this.settingsService.list(),
    });
  };

  updateSettings = async (req: AuthenticatedRequest, res: Response) => {
    const parsed = updateSettingsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid settings",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const settings = await this.settingsService.update(
      parsed.data.values,
      Number(req.user.userId),
    );

    res.status(200).json({ message: "Settings updated", settings });
  };

  testConnection = async (req: AuthenticatedRequest, res: Response) => {
    const tests = {
      anthropic: () => this.integrations.testClaude(),
      discogs: () => this.integrations.testDiscogs(),
    };

    const integration = req.params.integration;
    const test = integration === "anthropic" || integration === "discogs"
      ? tests[integration]
      : undefined;

    if (!test) {
      res.status(404).json({ message: "Unknown integration" });
      return;
    }

    const result = await test();

    res.status(200).json({
      message: result.ok ? "Connection works" : result.message,
      ok: result.ok,
    });
  };
}

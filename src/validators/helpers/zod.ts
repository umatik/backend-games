import type { z } from "zod";

export type ValidationIssue = {
  path: string;
  message: string;
};

export const formatZodIssues = (error: z.ZodError): ValidationIssue[] =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));

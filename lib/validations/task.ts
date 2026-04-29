import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(120, "Title must be 120 characters or fewer."),
  description: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(500, "Description must be 500 characters or fewer.").optional(),
  ),
});

export const taskIdSchema = z.string().uuid("Invalid task identifier.");

export const taskActionStateSchema = z.object({
  error: z.string().optional(),
  success: z.boolean().optional(),
});

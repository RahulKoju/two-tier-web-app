import { z } from "zod";
import { getDescriptionTextContent, normalizeDescriptionInput } from "@/lib/rich-text";

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

      return normalizeDescriptionInput(value);
    },
    z
      .string()
      .refine(
        (value) => getDescriptionTextContent(value).length <= 500,
        "Description must be 500 characters or fewer.",
      )
      .optional(),
  ),
});

export const taskIdSchema = z.string().uuid("Invalid task identifier.");

export const taskActionStateSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  resetToken: z.string().optional(),
});

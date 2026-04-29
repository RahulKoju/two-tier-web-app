"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { createTaskSchema, taskActionStateSchema, taskIdSchema } from "@/lib/validations/task";

export type TaskActionState = {
  error?: string;
  success?: boolean;
};

export async function createTask(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to create task.",
    };
  }

  try {
    await getPrisma().task.create({
      data: parsed.data,
    });
  } catch {
    return {
      error: "Unable to save the task right now.",
    };
  }

  revalidatePath("/");
  return taskActionStateSchema.parse({ success: true });
}

export async function toggleTask(taskId: string, completed: boolean) {
  const idResult = taskIdSchema.safeParse(taskId);

  if (!idResult.success) {
    throw new Error("Invalid task id.");
  }

  try {
    await getPrisma().task.update({
      where: { id: idResult.data },
      data: { completed },
    });
  } catch {
    throw new Error("Unable to update the task.");
  }

  revalidatePath("/");
}

export async function deleteTask(taskId: string) {
  const idResult = taskIdSchema.safeParse(taskId);

  if (!idResult.success) {
    throw new Error("Invalid task id.");
  }

  try {
    await getPrisma().task.delete({
      where: { id: idResult.data },
    });
  } catch {
    throw new Error("Unable to delete the task.");
  }

  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { getSafeDatabaseErrorMessage } from "@/lib/errors";
import {
  createTaskSchema,
  taskActionStateSchema,
  taskIdSchema,
} from "@/lib/validations/task";

export type TaskActionState = {
  success: boolean;
  error?: string;
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
    return taskActionStateSchema.parse({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Unable to create task.",
    });
  }

  try {
    await getPrisma().task.create({
      data: parsed.data,
    });
  } catch (error) {
    console.error(error);
    return taskActionStateSchema.parse({
      success: false,
      error: getSafeDatabaseErrorMessage(error),
    });
  }

  revalidatePath("/");
  return taskActionStateSchema.parse({ success: true });
}

export async function toggleTask(
  taskId: string,
  completed: boolean,
): Promise<TaskActionState> {
  const idResult = taskIdSchema.safeParse(taskId);

  if (!idResult.success) {
    const error = new Error("Invalid task id.");
    console.error(error);
    return taskActionStateSchema.parse({
      success: false,
      error: error.message,
    });
  }

  try {
    await getPrisma().task.update({
      where: { id: idResult.data },
      data: { completed },
    });
  } catch (error) {
    console.error(error);
    return taskActionStateSchema.parse({
      success: false,
      error: getSafeDatabaseErrorMessage(error),
    });
  }

  revalidatePath("/");
  return taskActionStateSchema.parse({ success: true });
}

export async function deleteTask(taskId: string): Promise<TaskActionState> {
  const idResult = taskIdSchema.safeParse(taskId);

  if (!idResult.success) {
    const error = new Error("Invalid task id.");
    console.error(error);
    return taskActionStateSchema.parse({
      success: false,
      error: error.message,
    });
  }

  try {
    await getPrisma().task.delete({
      where: { id: idResult.data },
    });
  } catch (error) {
    console.error(error);
    return taskActionStateSchema.parse({
      success: false,
      error: getSafeDatabaseErrorMessage(error),
    });
  }

  revalidatePath("/");
  return taskActionStateSchema.parse({ success: true });
}

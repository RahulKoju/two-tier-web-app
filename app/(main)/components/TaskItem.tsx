"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTask, toggleTask } from "@/app/(main)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskRecord } from "@/types/task";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

type TaskItemProps = {
  task: TaskRecord;
};

export function TaskItem({ task }: TaskItemProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (checked: boolean) => {
    setError(null);

    startTransition(async () => {
      const result = await toggleTask(task.id, checked);

      if (!result.success) {
        setError(result.error ?? "Unable to update task.");
      }
    });
  };

  const handleDelete = () => {
    setError(null);

    startTransition(async () => {
      const result = await deleteTask(task.id);

      if (!result.success) {
        setError(result.error ?? "Unable to delete task.");
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <Checkbox
          checked={task.completed}
          onCheckedChange={(value) => handleToggle(value === true)}
          aria-label={`Mark ${task.title} as ${task.completed ? "not completed" : "completed"}`}
          disabled={isPending}
          className="mt-1"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={
              task.completed
                ? "text-sm font-medium text-slate-500 line-through"
                : "text-sm font-medium text-slate-900"
            }
          >
            {task.title}
          </p>

          {task.description ? (
            <div
              className="task-description text-sm leading-6 text-slate-600"
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          ) : null}

          <p className="text-xs text-slate-400">
            Created {dateFormatter.format(new Date(task.createdAt))}
          </p>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

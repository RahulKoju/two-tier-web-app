import { TaskItem } from "@/app/(main)/components/TaskItem";
import type { TaskRecord } from "@/types/task";

type TaskListProps = {
  tasks: TaskRecord[];
};

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">No tasks yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Add your first task above to start tracking work.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}

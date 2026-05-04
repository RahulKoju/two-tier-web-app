import { TaskForm } from "@/app/(main)/components/TaskForm";
import { TaskList } from "@/app/(main)/components/TaskList";
import { getPrisma } from "@/lib/db";
import { createLoggedServerError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Task Tracker",
  description:
    "Minimal task tracker built with Next.js, Prisma, and PostgreSQL.",
};

async function getTasks() {
  try {
    const tasks = await getPrisma().task.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return tasks.map((task) => ({
      ...task,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error(error);
    throw createLoggedServerError("Unable to load tasks right now.", error);
  }
}

export default async function TaskPage() {
  const tasks = await getTasks();
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Task Tracker
        </h1>
        <p className="text-sm text-slate-600">
          Server-rendered task management with Prisma, PostgreSQL, and minimal
          client interactivity.
        </p>
      </section>

      <section className="mt-8">
        <TaskForm />
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Tasks</h2>
          <p className="text-sm text-slate-500">
            {completedCount}/{tasks.length} completed
          </p>
        </div>
        <TaskList tasks={tasks} />
      </section>
    </main>
  );
}

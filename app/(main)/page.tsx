import { TaskForm } from "@/app/(main)/components/TaskForm";
import { TaskList } from "@/app/(main)/components/TaskList";
import { getPrisma } from "@/lib/db";
import { createLoggedServerError } from "@/lib/errors";
import { Task } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System Overview",
  description:
    "Production-style two-tier web application with Next.js, Prisma, PostgreSQL, Docker Compose, Jenkins CI/CD, Nginx, SSL, and systemd-backed deployment.",
};

async function getTasks() {
  try {
    const tasks = await getPrisma().task.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return tasks.map((task: Task) => ({
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
          Two-Tier Web App
        </h1>
        <p className="text-sm text-slate-600">
          Production-style two-tier web application deployed on AWS EC2 with
          Next.js 16, Prisma, PostgreSQL, Docker Compose, Jenkins CI/CD, Nginx
          reverse proxy, Certbot SSL, and systemd auto-start.
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

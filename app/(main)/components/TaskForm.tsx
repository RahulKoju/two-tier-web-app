"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createTask, type TaskActionState } from "@/app/(main)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: TaskActionState = { success: false };
const RichTextEditor = dynamic(
  () => import("@/app/(main)/components/RichTextEditor").then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2">
        <div className="rounded-md border border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-2">
            <div className="h-9 w-9 rounded-md border border-slate-200 bg-white" />
            <div className="h-9 w-9 rounded-md border border-slate-200 bg-white" />
            <div className="h-9 w-9 rounded-md border border-slate-200 bg-white" />
            <div className="h-9 w-9 rounded-md border border-slate-200 bg-white" />
            <div className="h-9 w-9 rounded-md border border-slate-200 bg-white" />
          </div>
          <div className="min-h-32 rounded-b-md border-x border-b border-slate-200 bg-white px-3 py-3" />
        </div>
        <p className="text-sm text-slate-500">Optional details for the task</p>
        <div className="flex items-center justify-between text-xs">
          <p className="text-slate-500">Supports bold, italic, lists, and links.</p>
          <p className="text-slate-500">0/500 characters</p>
        </div>
      </div>
    ),
  },
);

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding..." : "Add task"}
    </Button>
  );
}

export function TaskForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createTask, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success, state.resetToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a task</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">
              Title
            </label>
            <Input
              id="title"
              name="title"
              placeholder="Review deployment checklist"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-slate-700">
              Description
            </label>
            <RichTextEditor
              id="description"
              name="description"
              placeholder="Optional details for the task"
              maxLength={500}
              resetToken={state.resetToken}
            />
          </div>

          {state.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

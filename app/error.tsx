"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

const isDevelopment = process.env.NODE_ENV === "development";

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          This page couldn&apos;t load
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Something went wrong while loading this page. Please try again.
        </p>

        {isDevelopment ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-sm font-medium text-amber-950">
              Development details
            </p>
            <p className="mt-2 break-words font-mono text-xs text-amber-900">
              {error.message}
            </p>
            {error.digest ? (
              <p className="mt-2 font-mono text-xs text-amber-800">
                Digest: {error.digest}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-amber-800">
              Check the server or container logs for the full stack trace.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm leading-6 text-slate-500">
            If the problem continues, verify that required backend services are available.
          </p>
        )}

        <div className="mt-6">
          <Button type="button" onClick={() => unstable_retry()}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}

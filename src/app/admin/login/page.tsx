"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLock, IconXCircle } from "@/components/icons";

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setSubmitting(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-mesh flex min-h-screen items-center justify-center px-4">
      <div className="animate-scale-in w-full max-w-sm rounded-2xl border border-white/60 bg-white/90 p-8 shadow-xl shadow-indigo-950/5 ring-1 ring-gray-900/5 backdrop-blur-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/25">
          <IconLock className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-gray-600">Vedantu Early Learning &mdash; resume review</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <IconXCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

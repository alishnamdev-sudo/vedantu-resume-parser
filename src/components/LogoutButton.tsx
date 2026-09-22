"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLogout } from "@/components/icons";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-60"
    >
      <IconLogout className="h-4 w-4" />
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}

import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { IconArrowUpTray, IconSparkles } from "@/components/icons";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/20">
              <IconSparkles className="h-[18px] w-[18px] text-white" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                Vedantu Early Learning
              </span>
              <span className="text-base font-bold text-gray-900">Candidate Review</span>
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/admin/bulk-upload"
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              <IconArrowUpTray className="h-4 w-4" />
              Bulk upload
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

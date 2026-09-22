"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import { PROGRAMMES, programmeLabel } from "@/lib/rubric";
import { IconCheckCircle, IconClock, IconSearch, IconUsers, IconXCircle } from "@/components/icons";

type CandidateRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  programme: string;
  source: string;
  verdict: string | null;
  fastTrack: boolean;
  analysisError: string | null;
  createdAt: string;
};

const VERDICT_FILTERS = [
  { value: "", label: "All verdicts" },
  { value: "GTG", label: "GTG" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "NOT_CONSIDERED", label: "Not Considered" },
  { value: "PENDING", label: "Pending / Failed" },
];

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export default function AdminDashboardPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState("");
  const [programme, setProgramme] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (verdict) params.set("verdict", verdict);
    if (programme) params.set("programme", programme);
    if (q) params.set("q", q);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- signals the filtered list is refetching
    setLoading(true);
    fetch(`/api/admin/candidates?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setCandidates(data.candidates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [verdict, programme, q]);

  const counts = useMemo(() => {
    return {
      total: candidates.length,
      gtg: candidates.filter((c) => c.verdict === "GTG").length,
      hold: candidates.filter((c) => c.verdict === "ON_HOLD").length,
      rejected: candidates.filter((c) => c.verdict === "NOT_CONSIDERED").length,
    };
  }, [candidates]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Showing" value={counts.total} icon={<IconUsers className="h-5 w-5" />} tone="indigo" />
        <StatCard label="GTG" value={counts.gtg} icon={<IconCheckCircle className="h-5 w-5" />} tone="green" />
        <StatCard label="On Hold" value={counts.hold} icon={<IconClock className="h-5 w-5" />} tone="amber" />
        <StatCard
          label="Not Considered"
          value={counts.rejected}
          icon={<IconXCircle className="h-5 w-5" />}
          tone="red"
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select value={verdict} onChange={(e) => setVerdict(e.target.value)} className={selectClass}>
          {VERDICT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select value={programme} onChange={(e) => setProgramme(e.target.value)} className={selectClass}>
          <option value="">All programmes</option>
          {PROGRAMMES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50/80">
            <tr>
              <Th>Candidate</Th>
              <Th>Programme</Th>
              <Th>Verdict</Th>
              <Th>Submitted</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && candidates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  <IconUsers className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2">No candidates match these filters.</p>
                </td>
              </tr>
            )}
            {!loading &&
              candidates.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                        {c.name.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-gray-500">{c.email ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700">
                    <div>{programmeLabel(c.programme as never)}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {c.subject && <span className="text-xs text-gray-500">{c.subject}</span>}
                      {c.source === "BULK_CSV" && (
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          CSV
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <VerdictBadge verdict={c.verdict} />
                      {c.fastTrack && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                          Fast-track
                        </span>
                      )}
                      {c.analysisError && (
                        <span
                          title={c.analysisError}
                          className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-600/10"
                        >
                          Analysis failed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/candidates/${c.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}

const TONE_STYLES: Record<string, { chip: string; value: string }> = {
  indigo: { chip: "bg-indigo-50 text-indigo-600", value: "text-gray-900" },
  green: { chip: "bg-green-50 text-green-600", value: "text-green-700" },
  amber: { chip: "bg-amber-50 text-amber-600", value: "text-amber-700" },
  red: { chip: "bg-red-50 text-red-600", value: "text-red-700" },
};

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: keyof typeof TONE_STYLES;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="group rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.chip}`}>{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${styles.value}`}>{value}</div>
    </div>
  );
}

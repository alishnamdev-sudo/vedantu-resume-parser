"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VerdictBadge from "@/components/VerdictBadge";
import { programmeLabel } from "@/lib/rubric";
import {
  IconArrowLeft,
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconPencil,
  IconRefresh,
  IconXCircle,
} from "@/components/icons";

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  programme: string;
  source: string;
  resumeFileName: string;
  resumeText: string;
  resumeSourceUrl: string | null;
  verdict: string | null;
  reason: string | null;
  matchedProfile: string | null;
  fastTrack: boolean;
  flags: string | null;
  analysisError: string | null;
  createdAt: string;
};

const cardClass = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState("GTG");
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/candidates/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCandidate(data.candidate);
    setOverrideVerdict(data.candidate.verdict ?? "GTG");
    setOverrideReason(data.candidate.reason ?? "");
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() manages its own loading state for a user-triggered refetch
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this report permanently? This also removes the stored resume file and can't be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/candidates/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 404) {
      router.push("/admin");
      return;
    }
    setDeleting(false);
    alert("Could not delete this report. Please try again.");
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    await fetch(`/api/admin/candidate-reanalyze/${id}`, { method: "POST" });
    await load();
    setReanalyzing(false);
  }

  async function handleSaveOverride() {
    setSavingOverride(true);
    setOverrideError(null);
    const res = await fetch(`/api/admin/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: overrideVerdict, reason: overrideReason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setOverrideError(data.error || "Could not save.");
      setSavingOverride(false);
      return;
    }
    setCandidate(data.candidate);
    setOverrideOpen(false);
    setSavingOverride(false);
  }

  if (loading) {
    return <p className="text-gray-500">Loading…</p>;
  }

  if (notFound || !candidate) {
    return (
      <div>
        <p className="text-gray-700">Candidate not found.</p>
        <Link href="/admin" className="mt-2 inline-block text-indigo-600 hover:text-indigo-500">
          Back to list
        </Link>
      </div>
    );
  }

  let flags: string[] = [];
  try {
    flags = candidate.flags ? JSON.parse(candidate.flags) : [];
  } catch {
    flags = [];
  }

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to all candidates
      </Link>

      <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-semibold text-white shadow-md shadow-indigo-500/25">
            {candidate.name.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
            <p className="text-gray-600">{candidate.email ?? "No email provided"}</p>
            <p className="text-gray-600">{candidate.phone ?? "No phone provided"}</p>
            <p className="mt-1.5 text-sm text-gray-500">
              Applied for <span className="font-medium text-gray-700">{programmeLabel(candidate.programme as never)}</span>
              {candidate.subject && <> &middot; Subject: {candidate.subject}</>} on{" "}
              {new Date(candidate.createdAt).toLocaleString()}
              {candidate.source === "BULK_CSV" && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  Bulk CSV upload
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VerdictBadge verdict={candidate.verdict} />
          {candidate.fastTrack && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              Fast-track
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={cardClass}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Analysis</h2>

            {candidate.analysisError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <IconXCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>Analysis failed: {candidate.analysisError}</p>
                  <button
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                  >
                    <IconRefresh className={`h-3.5 w-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
                    {reanalyzing ? "Retrying…" : "Retry analysis"}
                  </button>
                </div>
              </div>
            )}

            {!candidate.analysisError && candidate.verdict && (
              <>
                <p className="mt-3 text-gray-800">{candidate.reason}</p>
                {candidate.matchedProfile && (
                  <p className="mt-2 text-sm text-gray-500">Matched profile: {candidate.matchedProfile}</p>
                )}
                {flags.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 ring-1 ring-inset ring-amber-600/15">
                    <p className="text-sm font-medium text-amber-800">Flagged to verify:</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
                      {flags.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4">
                  <button
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-60"
                  >
                    <IconRefresh className={`h-3.5 w-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
                    {reanalyzing ? "Re-running…" : "Re-run analysis"}
                  </button>
                </div>
              </>
            )}

            {!candidate.analysisError && !candidate.verdict && (
              <p className="mt-3 text-sm text-gray-500">Analysis pending.</p>
            )}
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Resume text</h2>
              <button
                onClick={() => setShowResume((v) => !v)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                {showResume ? "Hide" : "Show"}
              </button>
            </div>
            {showResume && (
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 ring-1 ring-inset ring-gray-200">
                {candidate.resumeText}
              </pre>
            )}
            <a
              href={`/api/admin/candidate-resume/${candidate.id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <IconDownload className="h-4 w-4" />
              Download original file ({candidate.resumeFileName})
            </a>
            {candidate.resumeSourceUrl && (
              <a
                href={candidate.resumeSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-500"
              >
                <IconExternalLink className="h-3.5 w-3.5" />
                Original CSV link
              </a>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Manual override</h2>
              <button
                onClick={() => setOverrideOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                <IconPencil className="h-3.5 w-3.5" />
                {overrideOpen ? "Cancel" : "Edit"}
              </button>
            </div>

            {overrideOpen && (
              <div className="mt-3 space-y-3">
                {overrideError && <p className="text-sm text-red-600">{overrideError}</p>}
                <div>
                  <label className="block text-xs font-medium text-gray-700">Verdict</label>
                  <select
                    value={overrideVerdict}
                    onChange={(e) => setOverrideVerdict(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="GTG">GTG</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="NOT_CONSIDERED">Not Considered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Reason</label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  onClick={handleSaveOverride}
                  disabled={savingOverride}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/35 disabled:opacity-60"
                >
                  {savingOverride ? "Saving…" : "Save override"}
                </button>
              </div>
            )}

            {!overrideOpen && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                <IconFileText className="h-3.5 w-3.5" />
                Edit to set a different verdict manually.
              </p>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Delete report</h2>
            <p className="mt-2 text-xs text-gray-500">
              Permanently removes this candidate, their analysis, and the stored resume file.
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

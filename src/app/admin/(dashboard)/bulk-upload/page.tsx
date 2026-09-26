"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseCandidateCsv, parseCandidateTable, BulkCsvRow } from "@/lib/csv";
import { PROGRAMMES, resolveProgramme } from "@/lib/rubric";
import { IconArrowLeft, IconArrowUpTray, IconRefresh } from "@/components/icons";

type RowStatus = "pending" | "processing" | "success" | "error" | "skipped";

type BulkRow = BulkCsvRow & {
  status: RowStatus;
  detail: string;
  candidateId?: string;
};

const CONCURRENCY = 3;
const ADMIN_NAME_KEY = "bulkUploadAdminName";

function validateRow(row: BulkCsvRow): string | null {
  if (!row.name) return "Missing name";
  if (!row.resumeUrl) return "Missing resume link";
  if (!row.programme) return "Missing programme";
  if (!resolveProgramme(row.programme)) return `Unrecognised programme "${row.programme}"`;
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return `Invalid email "${row.email}"`;
  return null;
}

async function readCandidateFile(file: File) {
  if (/\.xls$/i.test(file.name)) {
    throw new Error("The old .xls format isn't supported. Please re-save it as .xlsx (or CSV) and try again.");
  }
  if (/\.xlsx$/i.test(file.name)) {
    // Loaded on demand so the Excel reader isn't part of every admin page's bundle.
    const { readSheet } = await import("read-excel-file/browser");
    let sheet;
    try {
      sheet = await readSheet(file); // first sheet only
    } catch {
      throw new Error("Couldn't read that Excel file. Make sure it's a valid .xlsx workbook.");
    }
    return parseCandidateTable(sheet.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))));
  }
  return parseCandidateCsv(await file.text());
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let next = 0;
  async function runNext(): Promise<void> {
    const index = next++;
    if (index >= items.length) return;
    await worker(items[index], index);
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
}

export default function BulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [started, setStarted] = useState(false);
  const [adminName, setAdminName] = useState("");
  const trimmedAdminName = adminName.trim();

  // Everyone shares one login, so the typed name is what attributes uploads. Remembering it
  // per browser keeps each admin's spelling consistent, which keeps the dashboard filter clean.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADMIN_NAME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restores the name after hydration
      if (saved) setAdminName(saved);
    } catch {}
  }, []);

  function handleAdminNameChange(value: string) {
    setAdminName(value);
    try {
      localStorage.setItem(ADMIN_NAME_KEY, value.trim());
    } catch {}
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStarted(false);
    setParseError(null);
    setFileName(file.name);

    let parsed: ReturnType<typeof parseCandidateCsv>;
    try {
      parsed = await readCandidateFile(file);
    } catch (err) {
      setRows([]);
      setParseError(err instanceof Error ? err.message : "Couldn't read that file.");
      return;
    }
    const { rows: parsedRows, missingColumns } = parsed;

    if (missingColumns.length > 0) {
      setRows([]);
      setParseError(
        `Couldn't find these required columns in the file: ${missingColumns.join(", ")}. Expected columns like "name", "resume link", and "programme" ("email" and "phone" are optional).`
      );
      return;
    }

    if (parsedRows.length === 0) {
      setParseError("No candidate rows found in that file.");
      return;
    }

    setRows(
      parsedRows.map((r) => ({
        ...r,
        status: "pending",
        detail: validateRow(r) ?? "",
      }))
    );
  }

  async function handleStart() {
    if (!trimmedAdminName) return;
    const uploadedBy = trimmedAdminName;
    setStarted(true);
    setProcessing(true);

    // Compute the plan synchronously off the current `rows` closure rather than inside a
    // setState updater: React does not guarantee an updater runs before the next line here,
    // so anything read back out of it (like validIndices) can't be trusted immediately after.
    const validIndices: number[] = [];
    const statusUpdates = new Map<number, { status: RowStatus; detail: string }>();
    rows.forEach((row, i) => {
      if (row.status === "success") return;
      const error = validateRow(row);
      if (error) {
        statusUpdates.set(i, { status: "skipped", detail: error });
      } else {
        statusUpdates.set(i, { status: "pending", detail: "" });
        validIndices.push(i);
      }
    });

    setRows((prev) =>
      prev.map((row, i) => {
        const update = statusUpdates.get(i);
        return update ? { ...row, ...update } : row;
      })
    );

    await runWithConcurrency(validIndices, CONCURRENCY, async (index) => {
      setRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: "processing", detail: "" };
        return next;
      });

      const row = rows[index];
      try {
        const res = await fetch("/api/admin/bulk-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            resumeUrl: row.resumeUrl,
            programme: row.programme,
            email: row.email || undefined,
            phone: row.phone || undefined,
            uploadedBy,
          }),
        });
        const data = await res.json();
        setRows((prev) => {
          const next = [...prev];
          if (res.ok && data.analysisError) {
            // Saved, but Gemini didn't return a verdict. Marked failed so "Re-run" picks it up;
            // the server finds the saved candidate and only redoes the analysis.
            next[index] = {
              ...next[index],
              status: "error",
              detail: "Saved, but analysis failed. Re-run to retry.",
              candidateId: data.candidateId,
            };
          } else if (res.ok) {
            next[index] = {
              ...next[index],
              status: "success",
              detail: data.duplicate ? "Already uploaded" : "Analyzed",
              candidateId: data.candidateId,
            };
          } else {
            next[index] = { ...next[index], status: "error", detail: data.error || "Failed" };
          }
          return next;
        });
      } catch {
        setRows((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status: "error", detail: "Network error" };
          return next;
        });
      }
    });

    setProcessing(false);
  }

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { pending: 0, processing: 0, success: 0, error: 0, skipped: 0 } as Record<RowStatus, number>
  );
  const donePct = rows.length > 0 ? Math.round(((counts.success + counts.error + counts.skipped) / rows.length) * 100) : 0;

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to all candidates
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/20">
          <IconArrowUpTray className="h-5 w-5 text-white" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Bulk upload from CSV or Excel</h1>
      </div>
      <p className="mt-2 max-w-2xl text-gray-600">
        Upload a CSV or Excel (.xlsx, first sheet) file with candidate name, resume link, programme, email, and phone. Each resume will be
        downloaded and run through the same analysis as the online form.
      </p>

      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-gray-700">
        <p className="font-medium text-gray-800">
          Expected columns <span className="font-normal text-gray-500">(header names matched case-insensitively)</span>
        </p>
        <ul className="mt-2 list-inside list-disc space-y-0.5">
          <li>
            <strong>name</strong> (required)
          </li>
          <li>
            <strong>resume link</strong> / resume url / cv link (required) &mdash; a direct file link
            or a Google Drive share link
          </li>
          <li>
            <strong>programme</strong> (required) &mdash; ESS (English), SS (Speakers), Coders, or V Math
            (full names like {PROGRAMMES.map((p) => p.label).join(", ")} also work)
          </li>
          <li>
            <strong>email</strong> (optional) &mdash; also matches &ldquo;email id&rdquo;
          </li>
          <li>
            <strong>phone</strong> (optional) &mdash; also matches contact, contact number, mobile
          </li>
        </ul>
      </div>

      <div className="mt-6 max-w-sm">
        <label htmlFor="admin-name" className="block text-sm font-medium text-gray-800">
          Your name <span className="text-red-600">*</span>
        </label>
        <input
          id="admin-name"
          type="text"
          required
          maxLength={100}
          value={adminName}
          onChange={(e) => handleAdminNameChange(e.target.value)}
          disabled={processing}
          placeholder="e.g. Priya Sharma"
          className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-gray-500">
          Every candidate in this upload is tagged with this name, so you can filter for them on the dashboard.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/35 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <IconArrowUpTray className="h-4 w-4" />
          Choose CSV or Excel file
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            disabled={processing || !trimmedAdminName}
            className="hidden"
          />
        </label>
        {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
      </div>

      {parseError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {parseError}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-gray-600">
                {rows.length} row{rows.length === 1 ? "" : "s"} parsed
                {started && (
                  <>
                    {" "}
                    &middot; {counts.success} succeeded &middot; {counts.error} failed &middot; {counts.skipped}{" "}
                    skipped
                    {(counts.pending > 0 || counts.processing > 0) && " · processing…"}
                  </>
                )}
              </div>
              {started && (
                <div className="mt-1.5 h-1.5 w-48 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${donePct}%` }}
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleStart}
              disabled={processing || !trimmedAdminName}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/35 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing && <IconRefresh className="h-4 w-4 animate-spin" />}
              {processing ? "Processing…" : started ? "Re-run failed/skipped" : "Start processing"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Programme
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className="transition-colors hover:bg-indigo-50/30">
                    <td className="px-4 py-2.5 text-gray-900">
                      {row.name || <em className="text-gray-400">missing</em>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{row.programme}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.email || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.phone || "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {row.status === "success" && row.candidateId ? (
                        <>
                          {row.detail} &middot;{" "}
                          <Link
                            href={`/admin/candidates/${row.candidateId}`}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            View result
                          </Link>
                        </>
                      ) : (
                        row.detail
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  const styles: Record<RowStatus, string> = {
    pending: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/15",
    processing: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
    success: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
    error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
    skipped: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  };
  const labels: Record<RowStatus, string> = {
    pending: "Pending",
    processing: "Processing…",
    success: "Done",
    error: "Failed",
    skipped: "Skipped",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status === "processing" && <IconRefresh className="h-3 w-3 animate-spin" />}
      {labels[status]}
    </span>
  );
}

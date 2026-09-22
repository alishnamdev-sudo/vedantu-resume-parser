"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PROGRAMMES } from "@/lib/rubric";
import { IconFileText, IconUploadCloud, IconXCircle } from "@/components/icons";

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function isAcceptedFile(file: File) {
  return /\.(pdf|docx)$/i.test(file.name);
}

export default function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function selectFile(f: File | null) {
    if (f && !isAcceptedFile(f)) {
      setError("Please upload a resume in PDF or Word (.docx) format.");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!formRef.current) return;
    if (!file) {
      setError("Please attach your resume.");
      return;
    }

    const formData = new FormData(formRef.current);
    formData.set("resume", file);

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push("/thank-you");
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="animate-fade-up flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <IconXCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full name
        </label>
        <input id="name" name="name" type="text" required className={inputClass} placeholder="Jane Doe" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className={inputClass}
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      <div>
        <label htmlFor="programme" className="block text-sm font-medium text-gray-700">
          Programme you&apos;re applying for
        </label>
        <select id="programme" name="programme" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select a programme
          </option>
          {PROGRAMMES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.grades})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Resume / CV</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            selectFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`relative mt-1.5 flex items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 transition-colors ${
            dragActive
              ? "border-indigo-500 bg-indigo-50"
              : file
                ? "border-indigo-200 bg-indigo-50/40"
                : "border-gray-300 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <div className="pointer-events-none text-center">
            {file ? (
              <>
                <IconFileText className="mx-auto h-8 w-8 text-indigo-500" />
                <p className="mt-2 text-sm font-medium text-indigo-700">{file.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB &middot; click or drop to replace
                </p>
              </>
            ) : (
              <>
                <IconUploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold text-indigo-600">Click to upload</span> or drag and
                  drop
                </p>
                <p className="mt-0.5 text-xs text-gray-500">PDF or Word (.docx) only, up to 8MB</p>
              </>
            )}
          </div>
          <input
            id="resume"
            name="resume"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="group relative flex w-full justify-center overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="relative">
          {submitting ? "Submitting your application…" : "Submit application"}
        </span>
      </button>
    </form>
  );
}

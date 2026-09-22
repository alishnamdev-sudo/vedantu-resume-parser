import UploadForm from "@/components/UploadForm";
import { IconSparkles } from "@/components/icons";

export default function Home() {
  return (
    <div className="bg-mesh relative min-h-screen overflow-hidden py-16 px-4 sm:px-6">
      <div className="relative mx-auto max-w-2xl">
        <div className="animate-fade-up text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 shadow-sm backdrop-blur">
            <IconSparkles className="h-3.5 w-3.5" />
            Vedantu Early Learning
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Master Teacher{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              Application
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
            Fill in your details and upload your resume. We&apos;ll review it and get back to you
            soon.
          </p>
        </div>

        <div
          className="animate-fade-up mt-10 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-indigo-950/5 ring-1 ring-gray-900/5 backdrop-blur-sm sm:p-8"
          style={{ animationDelay: "80ms" }}
        >
          <UploadForm />
        </div>
      </div>
    </div>
  );
}

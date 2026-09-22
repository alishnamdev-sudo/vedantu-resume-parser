import Link from "next/link";
import { IconArrowLeft, IconCheckCircle } from "@/components/icons";

export default function ThankYouPage() {
  return (
    <div className="bg-mesh flex min-h-screen items-center justify-center px-4">
      <div className="animate-scale-in w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-8 text-center shadow-xl shadow-indigo-950/5 ring-1 ring-gray-900/5 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-emerald-500/30">
          <IconCheckCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">Thank you!</h1>
        <p className="mt-2 text-gray-600">
          We&apos;ve received your application and resume. Our team will review it and get back to
          you soon.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}

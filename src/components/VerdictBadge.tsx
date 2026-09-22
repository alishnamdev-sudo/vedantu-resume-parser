const STYLES: Record<string, string> = {
  GTG: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  ON_HOLD: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  NOT_CONSIDERED: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  PENDING: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/15",
};

const DOT_STYLES: Record<string, string> = {
  GTG: "bg-green-500",
  ON_HOLD: "bg-amber-500",
  NOT_CONSIDERED: "bg-red-500",
  PENDING: "bg-gray-400",
};

const LABELS: Record<string, string> = {
  GTG: "GTG",
  ON_HOLD: "On Hold",
  NOT_CONSIDERED: "Not Considered",
  PENDING: "Pending",
};

export default function VerdictBadge({ verdict }: { verdict: string | null }) {
  const key = verdict ?? "PENDING";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[key]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[key]}`} />
      {LABELS[key]}
    </span>
  );
}

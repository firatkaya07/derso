import type { HealthTone } from "@/lib/admin-metrics";
import { toneLabel } from "@/lib/admin-metrics";

const TONE_STYLES: Record<HealthTone, { card: string; badge: string }> = {
  good: {
    card: "border-emerald-200 bg-white",
    badge: "bg-emerald-50 text-emerald-800",
  },
  watch: {
    card: "border-amber-200 bg-white",
    badge: "bg-amber-50 text-amber-900",
  },
  risk: {
    card: "border-red-200 bg-white",
    badge: "bg-red-50 text-red-800",
  },
  neutral: {
    card: "border-slate-200 bg-white",
    badge: "bg-slate-100 text-slate-700",
  },
};

export function HealthMetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: HealthTone;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <article
      className={`h-full rounded-2xl border p-5 shadow-sm transition-shadow group-hover:shadow ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-600">{label}</p>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}
        >
          {toneLabel(tone)}
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </article>
  );
}

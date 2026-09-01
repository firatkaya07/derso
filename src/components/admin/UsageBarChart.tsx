import type { UsageDailyPoint } from "@/lib/admin-metrics";
import { barHeightPercent, formatDayTick, maxDailyValue } from "@/lib/admin-metrics";

const SERIES = [
  { key: "downloads" as const, label: "İndirme", className: "bg-indigo-600" },
  {
    key: "schedule_starts" as const,
    label: "Dağıtım başlatma",
    className: "bg-teal-600",
  },
];

export function UsageBarChart({
  points,
}: {
  points: UsageDailyPoint[];
}) {
  const max = maxDailyValue(points);
  const tickEvery = points.length > 14 ? Math.ceil(points.length / 7) : 1;

  if (points.length === 0) {
    return (
      <p className="text-sm text-slate-500">Bu dönemde olay kaydı yok.</p>
    );
  }

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4 text-xs text-slate-600">
        {SERIES.map((series) => (
          <li key={series.key} className="inline-flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-sm ${series.className}`}
              aria-hidden
            />
            {series.label}
          </li>
        ))}
      </ul>
      <div
        className="flex items-end gap-1 overflow-x-auto"
        role="img"
        aria-label="Günlük indirme ve dağıtım başlatma sayıları"
      >
        {points.map((point, index) => (
          <div
            key={point.day}
            className="flex min-w-[18px] flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-28 w-full items-end justify-center gap-px">
              {SERIES.map((series) => {
                const value = point[series.key];
                const height = barHeightPercent(value, max);
                return (
                  <div
                    key={series.key}
                    className={`w-1.5 rounded-t-sm sm:w-2 ${series.className} ${
                      value === 0 ? "opacity-20" : ""
                    }`}
                    style={{ height: value === 0 ? "4px" : `${height}%` }}
                    title={`${formatDayTick(point.day)} · ${series.label}: ${value}`}
                  />
                );
              })}
            </div>
            <span
              className={`w-full truncate text-center text-[10px] leading-4 text-slate-500 ${
                index % tickEvery === 0 ? "" : "opacity-0"
              }`}
            >
              {formatDayTick(point.day)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

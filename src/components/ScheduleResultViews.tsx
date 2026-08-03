"use client";

import type { ScheduleResult, GeneratedLesson } from "@/lib/scheduler";
import type { RoundLog } from "@/lib/schedule-job";
import { DAY_NAMES } from "@/lib/types";

export function CoverageCard({ result }: { result: ScheduleResult }) {
  const { placedHours, totalHours, maxPlaceableHours, elapsedMs } = result.stats;
  const percent = totalHours > 0 ? (placedHours / totalHours) * 100 : 100;
  const atLimit = placedHours >= maxPlaceableHours;
  const complete = placedHours === totalHours;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-end justify-between mb-3 gap-4">
        <div>
          <div className="text-4xl font-bold text-gray-900">
            %{percent.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {placedHours} / {totalHours} ders saati yerleştirildi
          </div>
        </div>
        <div className="text-right text-xs text-gray-400">
          <div>{result.unplaced.length} ders eksik</div>
          <div>{(elapsedMs / 1000).toFixed(1)} sn</div>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${complete ? "bg-green-500" : atLimit ? "bg-blue-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      {complete ? (
        <p className="text-sm text-green-700">Bütün dersler yerleştirildi.</p>
      ) : atLimit ? (
        <p className="text-sm text-blue-700">
          Bu, mevcut ders saatleri ve öğretmen kadrosuyla ulaşılabilecek en
          yüksek orandır ({maxPlaceableHours} saat). Daha fazlası için aşağıdaki
          nedenleri giderin.
        </p>
      ) : (
        <p className="text-sm text-amber-700">
          Kısıtlara göre {maxPlaceableHours} saate kadar çıkılabilir. Arama turu
          sayısını artırıp tekrar deneyebilirsiniz.
        </p>
      )}
    </div>
  );
}

export function ScheduleTable({ lessons }: { lessons: GeneratedLesson[] }) {
  const sorted = [...lessons].sort((a, b) => {
    if (a.className !== b.className)
      return a.className.localeCompare(b.className, "tr");
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-3">Program Ayrıntısı</h3>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500">Sınıf</th>
              <th className="text-left py-2 px-3 text-gray-500">Gün</th>
              <th className="text-left py-2 px-3 text-gray-500">Saat</th>
              <th className="text-left py-2 px-3 text-gray-500">Ders</th>
              <th className="text-left py-2 px-3 text-gray-500">Öğretmen</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lesson, i) => (
              <tr
                key={`${lesson.classId}-${lesson.dayOfWeek}-${lesson.startTime}-${i}`}
                className="border-b border-gray-100"
              >
                <td className="py-1.5 px-3 font-medium text-gray-900">
                  {lesson.className}
                </td>
                <td className="py-1.5 px-3">
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                    {DAY_NAMES[lesson.dayOfWeek]}
                  </span>
                </td>
                <td className="py-1.5 px-3 text-gray-600 font-mono text-xs">
                  {lesson.startTime}-{lesson.endTime}
                </td>
                <td className="py-1.5 px-3 text-gray-900">
                  {lesson.subjectName}
                </td>
                <td className="py-1.5 px-3 text-gray-600">
                  {lesson.teacherName || (
                    <span className="text-red-400 italic">Atanamadı</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SearchProgressPanel({
  generating,
  rounds,
  roundLogs,
  best,
}: {
  generating: boolean;
  rounds: number;
  roundLogs: RoundLog[];
  best: ScheduleResult | null;
}) {
  const latest = roundLogs[roundLogs.length - 1];
  const progress = Math.min(100, (roundLogs.length / Math.max(1, rounds)) * 100);
  const totalHours = best?.stats.totalHours;
  const maxPlaceable = best?.stats.maxPlaceableHours;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {generating ? "Program aranıyor…" : "Arama tamamlandı"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Her tur sıfırdan kurulum + onarım dener; en iyi sonuç saklanır.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 tabular-nums">
            {roundLogs.length}
            <span className="text-gray-400 text-lg font-medium">/{rounds}</span>
          </div>
          <div className="text-xs text-gray-400">tur</div>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${generating ? "bg-blue-600" : "bg-green-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat
          label="En iyi yerleşen"
          value={latest ? `${latest.bestHours}` : "—"}
          hint={totalHours != null ? `/ ${totalHours} saat` : undefined}
        />
        <Stat
          label="Son tur"
          value={latest ? `${latest.placedHours}` : "—"}
          hint="saat"
        />
        <Stat
          label="Ulaşılabilir üst"
          value={maxPlaceable != null ? `${maxPlaceable}` : "—"}
          hint="saat"
        />
        <Stat
          label="Son uyarı"
          value={latest ? `${latest.warningCount}` : "—"}
        />
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 max-h-72 overflow-y-auto">
        {roundLogs.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">
            İlk tur başlıyor…
          </p>
        ) : (
          <div className="divide-y divide-gray-100 font-mono text-xs">
            {[...roundLogs].reverse().map((log) => {
              const isBest = log.placedHours === log.bestHours;
              return (
                <div
                  key={log.round}
                  className={`flex flex-wrap items-center gap-3 px-4 py-2 ${
                    isBest ? "bg-green-50/80" : ""
                  }`}
                >
                  <span className="w-14 text-gray-500">#{log.round}</span>
                  <span className="text-gray-800">
                    Yerleşen: {log.placedHours} saat
                  </span>
                  <span className="text-gray-400">
                    En iyi: {log.bestHours}
                  </span>
                  {log.warningCount > 0 && (
                    <span className="text-amber-600">
                      {log.warningCount} uyarı
                    </span>
                  )}
                  {isBest && (
                    <span className="text-green-700 font-semibold ml-auto">
                      ★ En iyi
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
      <div className="text-[11px] text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">
        {value}
        {hint && (
          <span className="text-xs font-normal text-gray-400 ml-1">{hint}</span>
        )}
      </div>
    </div>
  );
}

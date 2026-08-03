"use client";

import { DAY_NAMES } from "@/lib/types";
import type { TimeSlot } from "@/lib/schedule-rules";

export type GridCell =
  /** Sınıfın o gün/saatte dersi yok. */
  | { kind: "unavailable" }
  /** Öğretmenin izin günü. */
  | { kind: "off-day" }
  | {
      kind: "lesson";
      color: string;
      primary: string;
      secondary?: string;
      onRemove?: () => void;
    }
  | { kind: "placeable"; color: string; onPlace: () => void }
  /** Seçili ders bu slota konamaz; nedeni ipucu olarak gösterilir. */
  | { kind: "blocked"; reason?: string }
  | { kind: "empty" };

interface ScheduleGridProps {
  slots: TimeSlot[];
  getCell: (dayOfWeek: number, slot: TimeSlot) => GridCell;
  isDayHighlighted?: (dayOfWeek: number) => boolean;
}

const CELL_HEIGHT = "h-14";

/**
 * Sınıf ve öğretmen programı sayfalarının paylaştığı haftalık ızgara.
 * Sayfalar yalnızca her hücrenin durumunu üretir; çizim ve etkileşim burada.
 */
export default function ScheduleGrid({
  slots,
  getCell,
  isDayHighlighted,
}: ScheduleGridProps) {
  return (
    <table className="w-full border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 48 }} />
        {DAY_NAMES.map((_, i) => (
          <col key={i} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="p-1" />
          {DAY_NAMES.map((name, dayIdx) => (
            <th
              key={dayIdx}
              className={`p-1 text-center text-xs font-semibold ${
                isDayHighlighted?.(dayIdx) ? "text-red-400" : "text-gray-500"
              }`}
            >
              {name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {slots.map((slot, slotIdx) => (
          <tr key={slot.start}>
            <td className="p-1 text-center align-middle">
              <div className="text-xs font-semibold text-gray-500">
                {slotIdx + 1}
              </div>
              <div className="text-[9px] text-gray-300 leading-tight">
                {slot.start}
              </div>
            </td>
            {DAY_NAMES.map((_, dayIdx) => (
              <td key={dayIdx} className="p-1">
                <Cell cell={getCell(dayIdx, slot)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Cell({ cell }: { cell: GridCell }) {
  switch (cell.kind) {
    case "unavailable":
      return (
        <div
          className={`rounded-lg ${CELL_HEIGHT}`}
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)",
            backgroundColor: "#f3f4f6",
          }}
        />
      );

    case "off-day":
      return (
        <div
          className={`rounded-lg ${CELL_HEIGHT} bg-red-50 flex items-center justify-center`}
          title="İzin günü"
        >
          <svg
            className="w-5 h-5 text-red-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
      );

    case "lesson":
      return (
        <div
          className={`relative group rounded-lg ${CELL_HEIGHT} flex flex-col items-center justify-center border-2 transition-all ${
            cell.onRemove ? "cursor-pointer hover:shadow-md" : ""
          }`}
          style={{
            borderColor: cell.color,
            backgroundColor: `${cell.color}15`,
          }}
          onClick={cell.onRemove}
        >
          {cell.secondary && (
            <span className="text-[10px] font-semibold text-gray-600 group-hover:hidden">
              {cell.secondary}
            </span>
          )}
          <span
            className="text-xs font-bold group-hover:hidden"
            style={{ color: cell.color }}
          >
            {cell.primary}
          </span>
          {cell.onRemove && (
            <span className="hidden group-hover:flex items-center gap-1 text-red-500 text-[10px] font-bold">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Kaldır
            </span>
          )}
        </div>
      );

    case "placeable":
      return (
        <button
          type="button"
          className={`w-full rounded-lg ${CELL_HEIGHT} border-2 border-dashed transition-all hover:shadow-sm cursor-pointer`}
          style={{
            borderColor: cell.color,
            backgroundColor: `${cell.color}10`,
          }}
          onClick={cell.onPlace}
        >
          <svg
            className="w-4 h-4 mx-auto"
            fill="none"
            stroke={cell.color}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      );

    case "blocked":
      return (
        <div
          className={`rounded-lg ${CELL_HEIGHT} bg-gray-50 opacity-40`}
          title={cell.reason}
        />
      );

    case "empty":
      return (
        <div
          className={`rounded-lg ${CELL_HEIGHT} bg-gray-50 border border-gray-100`}
        />
      );
  }
}

import type { GeneratedSlot } from "@/lib/slot-management";

export default function SlotPreview({
  slots,
  emptyLabel = "Bu sürelerle güne hiç ders sığmıyor.",
}: {
  slots: GeneratedSlot[];
  emptyLabel?: string;
}) {
  if (slots.length === 0) {
    return <p className="text-xs text-red-600">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((slot) => (
        <span
          key={`${slot.start}-${slot.end}`}
          className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700"
        >
          <span className="text-gray-400 mr-1">{slot.index + 1}.</span>
          {slot.start}–{slot.end}
        </span>
      ))}
    </div>
  );
}

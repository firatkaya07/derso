"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SlotPreview from "@/components/SlotPreview";
import {
  InstitutionSettingsSections,
  INSTITUTION_INPUT_CLASS,
  SettingsTableMissingBanner,
  useInstitutionSettings,
} from "@/components/InstitutionSettings";
import { probeSettingsTable } from "@/lib/settings";
import {
  describeTiming,
  findOrphanLessons,
  SCHEDULE_PRESETS,
  slotsForWindow,
} from "@/lib/slot-management";

export default function GenelTanimlarPage() {
  const {
    supabase,
    organizationId,
    toast,
    form,
    update,
    initial,
    pairedSubjectLines,
    setPairedSubjectLines,
    processingLogo,
    tableMissing,
    setTableMissing,
    copiedSql,
    fields,
    newFieldName,
    setNewFieldName,
    fieldsLoading,
    fieldBusy,
    handleAddField,
    handleDeleteField,
    copySetupSql,
    handleLogoChange,
    saveInstitutionSettings,
  } = useInstitutionSettings();

  const [saving, setSaving] = useState(false);
  const [orphanCount, setOrphanCount] = useState<number | null>(null);

  const timing = useMemo(
    () => ({
      lessonMinutes: form.lessonDurationMinutes,
      breakMinutes: form.breakDurationMinutes,
    }),
    [form.lessonDurationMinutes, form.breakDurationMinutes]
  );

  const presetPreviews = useMemo(
    () =>
      SCHEDULE_PRESETS.map((preset) => ({
        preset,
        slots: slotsForWindow(
          { startTime: preset.startTime, endTime: preset.endTime },
          timing
        ),
      })),
    [timing]
  );

  const timingChanged =
    form.lessonDurationMinutes !== initial.lessonDurationMinutes ||
    form.breakDurationMinutes !== initial.breakDurationMinutes;

  useEffect(() => {
    if (!timingChanged) return;
    let cancelled = false;
    void (async () => {
      const [lessonsResult, daysResult] = await Promise.all([
        supabase
          .from("lessons")
          .select("id, class_id, day_of_week, start_time")
          .eq("organization_id", organizationId),
        supabase
          .from("class_schedule_days")
          .select("*")
          .eq("organization_id", organizationId),
      ]);
      if (cancelled) return;
      if (lessonsResult.error || daysResult.error) {
        setOrphanCount(null);
        return;
      }
      const orphans = findOrphanLessons(
        lessonsResult.data ?? [],
        daysResult.data ?? [],
        timing
      );
      setOrphanCount(orphans.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [timingChanged, timing, supabase, organizationId]);

  const effectiveOrphanCount = timingChanged ? orphanCount : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveInstitutionSettings();
      toast.success("Genel tanımlar kaydedildi.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/home"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Genel Tanımlar</h1>
            <p className="text-xs text-gray-500">
              Kurum bilgileri çıktı başlıklarında ve imza alanlarında kullanılır.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || tableMissing}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      <SettingsTableMissingBanner
        tableMissing={tableMissing}
        copiedSql={copiedSql}
        onCopySql={() => void copySetupSql()}
        onRecheck={() => {
          void probeSettingsTable(supabase).then((status) => {
            setTableMissing(status === "missing");
            if (status === "ok") {
              toast.success("settings tablosu hazır. Artık kaydedebilirsiniz.");
            } else if (status === "missing") {
              toast.error("Tablo hâlâ görünmüyor. SQL’i çalıştırıp birkaç saniye bekleyin.");
            } else {
              toast.error("Tablo kontrolü başarısız. Oturumunuzu kontrol edin.");
            }
          });
        }}
      />

      <div className="space-y-5">
        <InstitutionSettingsSections
          form={form}
          update={update}
          fields={fields}
          fieldsLoading={fieldsLoading}
          fieldBusy={fieldBusy}
          newFieldName={newFieldName}
          setNewFieldName={setNewFieldName}
          onAddField={() => void handleAddField()}
          onDeleteField={(field) => void handleDeleteField(field)}
          onLogoChange={(event) => void handleLogoChange(event)}
          processingLogo={processingLogo}
        />

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Program Ayarları</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ders Süresi (dakika)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={form.lessonDurationMinutes}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value)) update("lessonDurationMinutes", value);
                }}
                className={INSTITUTION_INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teneffüs Süresi (dakika)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={form.breakDurationMinutes}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value)) update("breakDurationMinutes", value);
                }}
                className={INSTITUTION_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Saat dilimi önizlemesi
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {describeTiming(timing)}. Sınıf gün pencereleri bu sürelerle
                dilimlenir.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presetPreviews.map(({ preset, slots }) => (
                  <div
                    key={preset.id}
                    className="rounded-lg bg-gray-50 border border-gray-200 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {preset.label}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {preset.startTime}–{preset.endTime} · {slots.length}{" "}
                          ders
                        </p>
                      </div>
                    </div>
                    <SlotPreview slots={slots} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {timingChanged && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 space-y-2">
              <p>
                Süreleri değiştirmek ders saati ızgarasını yeniden hesaplar.
                Kaydedilmiş dersler eski saatlerinde kalır; yeni ızgaraya
                uymayanlar programda görünmez hale gelebilir.
              </p>
              {effectiveOrphanCount !== null && effectiveOrphanCount > 0 && (
                <p className="font-medium">
                  Mevcut ayarla {effectiveOrphanCount} ders saati uyumsuz kalacak. Kaydettikten
                  sonra{" "}
                  <Link href="/dagitim" className="underline">
                    Dağıtım
                  </Link>{" "}
                  veya sınıf ders günlerinden temizleyip programı yeniden
                  oluşturun.
                </p>
              )}
              {effectiveOrphanCount === 0 && (
                <p>Mevcut ders saatleri yeni sürelerle hâlâ örtüşüyor.</p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Eşli Dersler</h2>
          <p className="text-xs text-gray-500 mb-4">
            Aynı öğretmene verilmesi gereken ders çiftleri. Her satırda iki ders
            adını &quot;A | B&quot; biçiminde yazın. Boş bırakırsanız varsayılan
            çiftler kullanılır.
          </p>
          <textarea
            value={pairedSubjectLines}
            onChange={(e) => setPairedSubjectLines(e.target.value)}
            rows={5}
            className={`${INSTITUTION_INPUT_CLASS} font-mono text-sm`}
            placeholder={"MATEMATİK 1 | MATEMATİK 2\nTÜRKÇE | EDEBİYAT"}
          />
        </section>
      </div>
    </form>
  );
}

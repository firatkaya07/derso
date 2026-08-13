"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/SettingsProvider";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/components/Toast";
import SlotPreview from "@/components/SlotPreview";
import {
  academicYearLabel,
  locationLabel,
  LOGO_SIZE,
  probeSettingsTable,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";
import { SETTINGS_SETUP_SQL } from "@/lib/settings-setup-sql";
import { LOGO_ACCEPTED_TYPES, resizeImageToSquareDataUrl } from "@/lib/image";
import {
  describeTiming,
  findOrphanLessons,
  SCHEDULE_PRESETS,
  slotsForWindow,
} from "@/lib/slot-management";
import {
  createField,
  deleteField,
  loadFields,
  type FieldRow,
} from "@/lib/fields";

export default function GenelTanimlarPage() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();
  const { organizationId } = useOrganization();
  const initial = useSettings();

  const [form, setForm] = useState<AppSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [processingLogo, setProcessingLogo] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [orphanCount, setOrphanCount] = useState<number | null>(null);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldBusy, setFieldBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void probeSettingsTable(supabase).then((status) => {
      if (!cancelled) setTableMissing(status === "missing");
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    setFieldsLoading(true);
    void loadFields(supabase, organizationId)
      .then((rows) => {
        if (!cancelled) setFields(rows);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message);
      })
      .finally(() => {
        if (!cancelled) setFieldsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, organizationId]);

  const handleAddField = async () => {
    const name = newFieldName.trim();
    if (!name) return;
    setFieldBusy(true);
    try {
      const row = await createField(supabase, organizationId, name);
      setFields((current) => [...current, row]);
      setNewFieldName("");
      router.refresh();
      toast.success(`“${row.name}” alanı eklendi.`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setFieldBusy(false);
    }
  };

  const handleDeleteField = async (field: FieldRow) => {
    setFieldBusy(true);
    try {
      await deleteField(supabase, field.id);
      setFields((current) => current.filter((row) => row.id !== field.id));
      router.refresh();
      toast.success(`“${field.name}” alanı silindi.`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setFieldBusy(false);
    }
  };

  const copySetupSql = async () => {
    try {
      await navigator.clipboard.writeText(SETTINGS_SETUP_SQL);
      setCopiedSql(true);
      toast.success("SQL panoya kopyalandı.");
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      toast.error("SQL kopyalanamadı. Metni elle seçip kopyalayın.");
    }
  };

  const update = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

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
    if (!timingChanged) {
      setOrphanCount(null);
      return;
    }
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

  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProcessingLogo(true);
    try {
      const dataUrl = await resizeImageToSquareDataUrl(file, LOGO_SIZE);
      update("logoDataUrl", dataUrl);
      toast.success(
        `Logo ${LOGO_SIZE}×${LOGO_SIZE} piksele ölçeklendi. Kaydetmeyi unutmayın.`
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setProcessingLogo(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveSettings(supabase, organizationId, {
        ...form,
        province: form.province?.trim() || null,
        district: form.district?.trim() || null,
        institutionName: form.institutionName?.trim() || null,
        principalName: form.principalName?.trim() || null,
        vicePrincipalName: form.vicePrincipalName?.trim() || null,
        academicYear: form.academicYear?.trim() || null,
      });
      // Ayarlar sayfa yerleşiminde sunucuda okunuyor; yenilemeden diğer
      // sayfalar eski değerleri görürdü.
      router.refresh();
      toast.success("Genel tanımlar kaydedildi.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900";

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

      {tableMissing && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold text-amber-900">
            settings tablosu veritabanında yok
          </p>
          <p className="mt-1 text-amber-800">
            Genel tanımları kaydetmek için Supabase SQL Editor&apos;de aşağıdaki
            SQL&apos;i bir kez çalıştırın; ardından bu sayfayı yenileyin.
          </p>
          <ol className="mt-3 list-decimal list-inside space-y-1 text-amber-800">
            <li>Supabase paneli → SQL Editor → New query</li>
            <li>SQL&apos;i yapıştırıp Run</li>
            <li>Bu sayfayı yenileyip Kaydet</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copySetupSql()}
              className="px-3 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-medium hover:bg-amber-800"
            >
              {copiedSql ? "Kopyalandı" : "SQL’i kopyala"}
            </button>
            <button
              type="button"
              onClick={() => {
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
              className="px-3 py-1.5 rounded-lg border border-amber-400 bg-white text-amber-900 text-xs font-medium hover:bg-amber-100"
            >
              Tekrar kontrol et
            </button>
          </div>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-white/80 border border-amber-200 p-3 text-[11px] leading-relaxed text-gray-800 whitespace-pre-wrap">
            {SETTINGS_SETUP_SQL}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Kurum Bilgileri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İl
              </label>
              <input
                type="text"
                value={form.province ?? ""}
                onChange={(e) => update("province", e.target.value)}
                className={inputClass}
                placeholder="Örnek: Ankara"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İlçe
              </label>
              <input
                type="text"
                value={form.district ?? ""}
                onChange={(e) => update("district", e.target.value)}
                className={inputClass}
                placeholder="Örnek: Çankaya"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kurum Adı
              </label>
              <input
                type="text"
                value={form.institutionName ?? ""}
                onChange={(e) => update("institutionName", e.target.value)}
                className={inputClass}
                placeholder="Örnek: Özel Derso Kurs Merkezi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kurum Müdürü
              </label>
              <input
                type="text"
                value={form.principalName ?? ""}
                onChange={(e) => update("principalName", e.target.value)}
                className={inputClass}
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Müdür Yardımcısı
              </label>
              <input
                type="text"
                value={form.vicePrincipalName ?? ""}
                onChange={(e) => update("vicePrincipalName", e.target.value)}
                className={inputClass}
                placeholder="Ad Soyad"
              />
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Çıktı başlığı önizlemesi
            </p>
            <div className="text-center leading-tight">
              {form.logoDataUrl && (
                <Image
                  src={form.logoDataUrl}
                  alt=""
                  width={52}
                  height={52}
                  unoptimized
                  className="mx-auto mb-1.5 object-contain"
                />
              )}
              <div className="text-[11px] text-gray-700">T.C.</div>
              <div className="text-[11px] text-gray-700">
                {locationLabel(form) || "İL / İLÇE"}
              </div>
              <div className="text-sm font-bold text-gray-900">
                {form.institutionName || "KURUM ADI"}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {academicYearLabel(form)} Eğitim-Öğretim Yılı
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Kurum Logosu</h2>
          <p className="text-xs text-gray-500 mb-4">
            Yüklenen görsel oranı korunarak {LOGO_SIZE}×{LOGO_SIZE} piksele
            ölçeklenir ve çıktıların başlığında kullanılır.
          </p>

          <div className="flex items-center gap-4">
            <div className="w-[100px] h-[100px] shrink-0 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              {form.logoDataUrl ? (
                <Image
                  src={form.logoDataUrl}
                  alt="Kurum logosu"
                  width={LOGO_SIZE}
                  height={LOGO_SIZE}
                  unoptimized
                />
              ) : (
                <span className="text-[10px] text-gray-400 text-center px-2">
                  Logo yok
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <label className="block">
                <span className="sr-only">Logo seç</span>
                <input
                  type="file"
                  accept={LOGO_ACCEPTED_TYPES.join(",")}
                  onChange={handleLogoChange}
                  disabled={processingLogo}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
                />
              </label>
              {form.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => update("logoDataUrl", null)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Logoyu kaldır
                </button>
              )}
              <p className="text-[11px] text-gray-400">
                PNG, JPEG, WEBP veya SVG · en fazla 2 MB
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Alanlar</h2>
          <p className="text-xs text-gray-500 mb-4">
            Sınıf ve ders formlarındaki alan listesi (TM, MF, SAY…). Kuruma özeldir.
          </p>

          {fieldsLoading ? (
            <p className="text-sm text-gray-400">Yükleniyor…</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {fields.map((field) => (
                <span
                  key={field.id}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 text-sm font-medium pl-3 pr-1.5 py-1 rounded-full"
                >
                  {field.name}
                  <button
                    type="button"
                    disabled={fieldBusy}
                    onClick={() => void handleDeleteField(field)}
                    className="w-6 h-6 rounded-full text-indigo-500 hover:bg-indigo-100 hover:text-indigo-800 disabled:opacity-50"
                    aria-label={`${field.name} alanını sil`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {fields.length === 0 && (
                <span className="text-sm text-amber-700">
                  Henüz alan yok. Aşağıdan ekleyin.
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center max-w-md">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddField();
                }
              }}
              placeholder="Yeni alan (örn. TM)"
              className={inputClass}
              disabled={fieldBusy}
            />
            <button
              type="button"
              onClick={() => void handleAddField()}
              disabled={fieldBusy || !newFieldName.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              Ekle
            </button>
          </div>
        </section>

        <section className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Program Ayarları</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eğitim-Öğretim Yılı
              </label>
              <input
                type="text"
                value={form.academicYear ?? ""}
                onChange={(e) => update("academicYear", e.target.value)}
                className={inputClass}
                placeholder={academicYearLabel({ ...form, academicYear: null })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Boş bırakılırsa içinde bulunulan öğretim yılı yazılır.
              </p>
            </div>
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
                className={inputClass}
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
                className={inputClass}
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
              {orphanCount !== null && orphanCount > 0 && (
                <p className="font-medium">
                  Mevcut ayarla {orphanCount} ders saati uyumsuz kalacak. Kaydettikten
                  sonra{" "}
                  <Link href="/dagitim" className="underline">
                    Dağıtım
                  </Link>{" "}
                  veya sınıf ders günlerinden temizleyip programı yeniden
                  oluşturun.
                </p>
              )}
              {orphanCount === 0 && (
                <p>Mevcut ders saatleri yeni sürelerle hâlâ örtüşüyor.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </form>
  );
}

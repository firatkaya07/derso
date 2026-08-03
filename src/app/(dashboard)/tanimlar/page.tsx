"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/Toast";
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
import { generateTimeSlots } from "@/lib/types";

/** Süre önizlemesinde kullanılan örnek gün. */
const PREVIEW_START = "16:40";
const PREVIEW_END = "19:50";

export default function GenelTanimlarPage() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();
  const initial = useSettings();

  const [form, setForm] = useState<AppSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [processingLogo, setProcessingLogo] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void probeSettingsTable(supabase).then((status) => {
      if (!cancelled) setTableMissing(status === "missing");
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

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

  const previewSlots = useMemo(
    () =>
      generateTimeSlots(PREVIEW_START, PREVIEW_END, {
        lessonMinutes: form.lessonDurationMinutes,
        breakMinutes: form.breakDurationMinutes,
      }),
    [form.lessonDurationMinutes, form.breakDurationMinutes]
  );

  const timingChanged =
    form.lessonDurationMinutes !== initial.lessonDurationMinutes ||
    form.breakDurationMinutes !== initial.breakDurationMinutes;

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
      await saveSettings(supabase, {
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
            href="/"
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

          <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              {PREVIEW_START}–{PREVIEW_END} arası bir gün böyle bölünür (
              {previewSlots.length} ders saati)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {previewSlots.map((slot, index) => (
                <span
                  key={slot.start}
                  className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700"
                >
                  <span className="text-gray-400 mr-1">{index + 1}.</span>
                  {slot.start}–{slot.end}
                </span>
              ))}
              {previewSlots.length === 0 && (
                <span className="text-xs text-red-600">
                  Bu sürelerle güne hiç ders sığmıyor.
                </span>
              )}
            </div>
          </div>

          {timingChanged && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              Süreleri değiştirmek ders saati ızgarasını yeniden hesaplar. Daha
              önce kaydedilmiş dersler eski saatlerinde kalır ve yeni ızgarayla
              örtüşmeyebilir; değişiklikten sonra programı yeniden oluşturmanız
              önerilir.
            </div>
          )}
        </section>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/SettingsProvider";
import { useOrganization } from "@/components/OrganizationProvider";
import { invalidateOrgClientCache } from "@/lib/cache";
import { useToast } from "@/components/Toast";
import {
  academicYearLabel,
  locationLabel,
  LOGO_SIZE,
  probeSettingsTable,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";
import { uploadInstitutionLogo } from "@/lib/logo-storage";
import { LOGO_ACCEPTED_TYPES } from "@/lib/image";
import {
  formatPairedSubjectLines,
  parsePairedSubjectLines,
} from "@/lib/paired-subjects";
import {
  createField,
  deleteField,
  loadFields,
  type FieldRow,
} from "@/lib/fields";

export const SETTINGS_SETUP_SQL = `-- Derso — kurum ayarları (organization_id PK)
-- Supabase migration 0004 ile uygulanır; elle çalıştırmayın.

-- settings.organization_id → organizations.id (kurum başına bir satır)
-- RLS: organization_id in (select user_organization_ids())
`;

export const INSTITUTION_INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900";

export function useInstitutionSettings() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();
  const { organizationId } = useOrganization();
  const initial = useSettings();

  const [form, setForm] = useState<AppSettings>(initial);
  const [pairedSubjectLines, setPairedSubjectLines] = useState(() =>
    formatPairedSubjectLines(initial.pairedSubjectPairs)
  );
  const [processingLogo, setProcessingLogo] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
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
  }, [supabase, organizationId, toast]);

  const update = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleAddField = async () => {
    const name = newFieldName.trim();
    if (!name) return;
    setFieldBusy(true);
    try {
      const row = await createField(supabase, organizationId, name);
      setFields((current) => [...current, row]);
      setNewFieldName("");
      invalidateOrgClientCache(organizationId);
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
      invalidateOrgClientCache(organizationId);
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

  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProcessingLogo(true);
    try {
      const logoUrl = await uploadInstitutionLogo(organizationId, file);
      update("logoDataUrl", logoUrl);
      toast.success(
        `Logo ${LOGO_SIZE}×${LOGO_SIZE} piksele ölçeklendi ve yüklendi. Kaydetmeyi unutmayın.`
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setProcessingLogo(false);
    }
  };

  const saveInstitutionSettings = async () => {
    const pairedSubjectPairs = parsePairedSubjectLines(pairedSubjectLines);
    await saveSettings(supabase, organizationId, {
      ...form,
      pairedSubjectPairs,
      province: form.province?.trim() || null,
      district: form.district?.trim() || null,
      institutionName: form.institutionName?.trim() || null,
      principalName: form.principalName?.trim() || null,
      vicePrincipalName: form.vicePrincipalName?.trim() || null,
      academicYear: form.academicYear?.trim() || null,
    });
    invalidateOrgClientCache(organizationId);
    router.refresh();
  };

  return {
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
  };
}

export function SettingsTableMissingBanner({
  tableMissing,
  copiedSql,
  onCopySql,
  onRecheck,
}: {
  tableMissing: boolean;
  copiedSql: boolean;
  onCopySql: () => void;
  onRecheck: () => void;
}) {
  if (!tableMissing) return null;

  return (
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
          onClick={onCopySql}
          className="px-3 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-medium hover:bg-amber-800"
        >
          {copiedSql ? "Kopyalandı" : "SQL’i kopyala"}
        </button>
        <button
          type="button"
          onClick={onRecheck}
          className="px-3 py-1.5 rounded-lg border border-amber-400 bg-white text-amber-900 text-xs font-medium hover:bg-amber-100"
        >
          Tekrar kontrol et
        </button>
      </div>
      <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-white/80 border border-amber-200 p-3 text-[11px] leading-relaxed text-gray-800 whitespace-pre-wrap">
        {SETTINGS_SETUP_SQL}
      </pre>
    </div>
  );
}

/** Kurum bilgisi, logo ve alanlar — V1/V2 ortak. */
export function InstitutionSettingsSections({
  form,
  update,
  fields,
  fieldsLoading,
  fieldBusy,
  newFieldName,
  setNewFieldName,
  onAddField,
  onDeleteField,
  onLogoChange,
  processingLogo,
}: {
  form: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  fields: FieldRow[];
  fieldsLoading: boolean;
  fieldBusy: boolean;
  newFieldName: string;
  setNewFieldName: (value: string) => void;
  onAddField: () => void;
  onDeleteField: (field: FieldRow) => void;
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  processingLogo: boolean;
}) {
  return (
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
              className={INSTITUTION_INPUT_CLASS}
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
              className={INSTITUTION_INPUT_CLASS}
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
              className={INSTITUTION_INPUT_CLASS}
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
              className={INSTITUTION_INPUT_CLASS}
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
              className={INSTITUTION_INPUT_CLASS}
              placeholder="Ad Soyad"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eğitim-Öğretim Yılı
            </label>
            <input
              type="text"
              value={form.academicYear ?? ""}
              onChange={(e) => update("academicYear", e.target.value)}
              className={INSTITUTION_INPUT_CLASS}
              placeholder={academicYearLabel({ ...form, academicYear: null })}
            />
            <p className="text-xs text-gray-400 mt-1">
              Boş bırakılırsa içinde bulunulan öğretim yılı yazılır.
            </p>
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
                onChange={onLogoChange}
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
                  onClick={() => onDeleteField(field)}
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
                onAddField();
              }
            }}
            placeholder="Yeni alan (örn. TM)"
            className={INSTITUTION_INPUT_CLASS}
            disabled={fieldBusy}
          />
          <button
            type="button"
            onClick={onAddField}
            disabled={fieldBusy || !newFieldName.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            Ekle
          </button>
        </div>
      </section>
    </div>
  );
}

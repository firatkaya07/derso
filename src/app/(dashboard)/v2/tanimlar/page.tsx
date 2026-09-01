"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/components/Toast";
import {
  InstitutionSettingsSections,
  SettingsTableMissingBanner,
  useInstitutionSettings,
} from "@/components/InstitutionSettings";
import { probeSettingsTable } from "@/lib/settings";
import { DAY_NAMES_SHORT } from "@/lib/types";
import { useV2Schedule } from "@/lib/v2/ScheduleProvider";
import {
  migrateLessonsToV2,
  saveScheduleProfilesV2,
  type ScheduleProfilesV2,
} from "@/lib/v2/profiles";
import {
  describeProfile,
  generateProfileSlots,
  normalizeBreaks,
  WEEKDAY_DAYS,
  WEEKEND_DAYS,
  type DayGroup,
  type ScheduleProfileV2,
} from "@/lib/v2/timeline";

function ProfileEditor({
  title,
  subtitle,
  days,
  profile,
  onChange,
}: {
  title: string;
  subtitle: string;
  days: readonly number[];
  profile: ScheduleProfileV2;
  onChange: (next: ScheduleProfileV2) => void;
}) {
  const slots = useMemo(() => generateProfileSlots(profile), [profile]);
  const breaks = normalizeBreaks(profile.slotCount, profile.breakMinutes);

  const update = (patch: Partial<ScheduleProfileV2>) => {
    const slotCount = patch.slotCount ?? profile.slotCount;
    const breakMinutes = normalizeBreaks(
      slotCount,
      patch.breakMinutes ?? profile.breakMinutes
    );
    onChange({ ...profile, ...patch, slotCount, breakMinutes });
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
        <p className="mt-1 text-xs text-emerald-700">{describeProfile(profile)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Başlangıç saati</span>
          <input
            type="time"
            value={profile.startTime}
            onChange={(e) => update({ startTime: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Ders süresi (dk)</span>
          <input
            type="number"
            min={5}
            max={180}
            value={profile.lessonDurationMinutes}
            onChange={(e) =>
              update({ lessonDurationMinutes: Number(e.target.value) || 40 })
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Slot (ders) sayısı</span>
          <input
            type="number"
            min={1}
            max={20}
            value={profile.slotCount}
            onChange={(e) => update({ slotCount: Number(e.target.value) || 1 })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
      </div>

      {breaks.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Teneffüs süreleri (N−1 = {breaks.length})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {breaks.map((mins, idx) => (
              <label key={idx} className="text-xs text-gray-600">
                {idx + 1}. → {idx + 2}. ders
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={mins}
                  onChange={(e) => {
                    const next = [...breaks];
                    next[idx] = Number(e.target.value) || 0;
                    update({ breakMinutes: next });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Saat</th>
              <th className="px-3 py-2">Süre</th>
              {days.map((d) => (
                <th key={d} className="px-2 py-2 text-center">
                  {DAY_NAMES_SHORT[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => (
              <Fragment key={slot.start}>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {slot.label}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {slot.start} – {slot.end}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {profile.lessonDurationMinutes} dk
                  </td>
                  {days.map((d) => (
                    <td key={d} className="px-2 py-2">
                      <div className="mx-auto h-8 rounded-md border border-dashed border-slate-200 bg-slate-50/70" />
                    </td>
                  ))}
                </tr>
                {i < breaks.length ? (
                  <tr className="bg-amber-50/40">
                    <td className="px-3 py-1.5 text-xs text-amber-800" colSpan={3}>
                      Teneffüs · {breaks[i]} dk
                    </td>
                    {days.map((d) => (
                      <td key={d} className="px-2 py-1.5">
                        <div className="mx-auto h-3 rounded bg-amber-100/80" />
                      </td>
                    ))}
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function V2TanimlarPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const toast = useToast();
  const { profiles, setProfiles } = useV2Schedule();
  const institution = useInstitutionSettings();
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const updateGroup = (group: DayGroup, next: ScheduleProfileV2) => {
    const copy: ScheduleProfilesV2 = {
      weekday: { ...profiles.weekday },
      weekend: { ...profiles.weekend },
    };
    copy[group] = { ...next, dayGroup: group };
    setProfiles(copy);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await institution.saveInstitutionSettings();
      await saveScheduleProfilesV2(supabase, organizationId, profiles);
      toast.success("Genel tanımlar kaydedildi.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateLessonsToV2(supabase, organizationId);
      toast.success(
        `V1 dersleri V2’ye aktarıldı: ${result.copied} kopyalandı` +
          (result.skipped ? `, ${result.skipped} atlandı` : "")
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/v2" className="text-sm text-emerald-700 hover:underline">
            ← V2 ana sayfa
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Genel Tanımlar · V2
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Kurum bilgileri V1 ile ortaktır. Saatler hafta içi / hafta sonu için
            ayrıdır; aşağıdaki tablolar yalnızca önizlemedir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleMigrate()}
            disabled={migrating}
            className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {migrating ? "Aktarılıyor…" : "V1 derslerini V2’ye aktar"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || institution.tableMissing}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <SettingsTableMissingBanner
        tableMissing={institution.tableMissing}
        copiedSql={institution.copiedSql}
        onCopySql={() => void institution.copySetupSql()}
        onRecheck={() => {
          void probeSettingsTable(supabase).then((status) => {
            institution.setTableMissing(status === "missing");
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

      <InstitutionSettingsSections
        form={institution.form}
        update={institution.update}
        fields={institution.fields}
        fieldsLoading={institution.fieldsLoading}
        fieldBusy={institution.fieldBusy}
        newFieldName={institution.newFieldName}
        setNewFieldName={institution.setNewFieldName}
        onAddField={() => void institution.handleAddField()}
        onDeleteField={(field) => void institution.handleDeleteField(field)}
        onLogoChange={(event) => void institution.handleLogoChange(event)}
        processingLogo={institution.processingLogo}
      />

      <ProfileEditor
        title="Hafta içi zaman çizelgesi"
        subtitle="Pazartesi – Cuma"
        days={WEEKDAY_DAYS}
        profile={profiles.weekday}
        onChange={(next) => updateGroup("weekday", next)}
      />

      <ProfileEditor
        title="Hafta sonu zaman çizelgesi"
        subtitle="Cumartesi – Pazar"
        days={WEEKEND_DAYS}
        profile={profiles.weekend}
        onChange={(next) => updateGroup("weekend", next)}
      />
    </div>
  );
}

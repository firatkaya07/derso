import type { Metadata } from "next";
import Link from "next/link";
import { getAdminUsageReport } from "@/lib/admin";
import {
  artifactLabel,
  editionLabel,
  formatInteger,
  formatLabel,
  formatPercent,
  formatShortDate,
  parseReportPeriod,
  REPORT_PERIODS,
} from "@/lib/admin-metrics";
import { UsageBarChart } from "@/components/admin/UsageBarChart";

export const metadata: Metadata = {
  title: "Raporlar — Admin",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ days?: string }>;
};

export default async function AdminReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = parseReportPeriod(params.days);
  const { report, error } = await getAdminUsageReport(days);
  const platform = report?.platform;
  const orgs = report?.organizations ?? [];
  const downloads = platform?.downloads ?? 0;
  const starts = platform?.schedule_starts ?? 0;
  const completes = platform?.schedule_completes ?? 0;
  const saves = platform?.schedule_saves ?? 0;
  const successRate =
    completes > 0
      ? Math.round(
          ((platform?.schedule_complete_success ?? 0) * 100) / completes
        )
      : null;
  const orgsWithSchedule = orgs.filter((org) => org.has_schedule).length;
  const orgsWithDownload = orgs.filter((org) => org.downloads > 0).length;
  const orgsWithScheduleUse = orgs.filter(
    (org) => org.schedule_starts > 0 || org.schedule_saves > 0
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kullanım raporları</h1>
          <p className="mt-1 text-sm text-slate-600">
            İndirme ve ders dağıtımı sıklığı — platform ve kurum bazında.
          </p>
        </div>
        <div className="flex gap-2 text-sm" role="group" aria-label="Dönem">
          {REPORT_PERIODS.map((period) => (
            <Link
              key={period}
              href={`/admin/raporlar?days=${period}`}
              className={`min-h-11 rounded-lg border px-3 py-1.5 ${
                days === period
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {period} gün
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        İndirme ve dağıtım sıklığı, kullanıcıların bu sürümden sonraki
        işlemlerinden kaydedilir. Kaydedilmiş ders programının varlığı mevcut
        ders saatlerinden hesaplanır.
      </p>

      <section aria-labelledby="platform-heading" className="space-y-4">
        <h2 id="platform-heading" className="text-lg font-semibold tracking-tight">
          Platform
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="İndirme"
            value={formatInteger(downloads)}
            hint={`${orgsWithDownload} kurum bu dönemde indirdi`}
          />
          <StatCard
            label="Dağıtım başlatma"
            value={formatInteger(starts)}
            hint={`${orgsWithScheduleUse} kurum özelliği kullandı`}
          />
          <StatCard
            label="Dağıtım kaydı"
            value={formatInteger(saves)}
            hint="Otomatik programın kaydedilmesi"
          />
          <StatCard
            label="Dağıtım başarı oranı"
            value={formatPercent(successRate)}
            hint={`${formatInteger(completes)} tamamlanan arama`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
            <h3 className="font-semibold">Günlük sıklık</h3>
            <p className="mt-1 text-xs text-slate-500">
              Son {days} gün, Europe/Istanbul takvim gününe göre.
            </p>
            <div className="mt-4">
              <UsageBarChart points={platform?.daily ?? []} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
            <h3 className="font-semibold">İndirme türleri</h3>
            <p className="mt-1 text-xs text-slate-500">
              Çıktı, biçim ve program sürümü.
            </p>
            {(platform?.downloads_by_artifact.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Bu dönemde indirme kaydı yok.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="pb-2 font-medium">Çıktı</th>
                      <th className="pb-2 font-medium">Biçim</th>
                      <th className="pb-2 font-medium">Sürüm</th>
                      <th className="pb-2 font-medium text-right">Adet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(platform?.downloads_by_artifact ?? []).map((row) => (
                      <tr
                        key={`${row.artifact}-${row.format}-${row.edition}`}
                        className="border-t border-slate-100"
                      >
                        <td className="py-2">{artifactLabel(row.artifact)}</td>
                        <td className="py-2">{formatLabel(row.format)}</td>
                        <td className="py-2">{editionLabel(row.edition)}</td>
                        <td className="py-2 text-right font-medium">
                          {formatInteger(row.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="orgs-heading" className="space-y-3">
        <div>
          <h2 id="orgs-heading" className="text-lg font-semibold tracking-tight">
            Kurumlar
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {orgsWithSchedule}/{orgs.length} kurumun dağıtılmış programı var.
            Sayılar seçilen {days} günlük döneme aittir.
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Kurum</th>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">İndirme</th>
                <th className="px-4 py-3 font-medium">Dağıtım</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Son indirme
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  Son dağıtım
                </th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Kurum yok.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr
                    key={org.id}
                    id={`org-${org.id}`}
                    className="border-t border-slate-100 scroll-mt-24"
                  >
                    <td className="px-4 py-3 font-medium">{org.name}</td>
                    <td className="px-4 py-3">
                      {org.has_schedule ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Var
                          {org.lesson_count_v2 > 0 && org.lesson_count > 0
                            ? " · V1/V2"
                            : org.lesson_count_v2 > 0
                              ? " · V2"
                              : " · V1"}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          Yok
                        </span>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatInteger(org.lesson_count + org.lesson_count_v2)}{" "}
                        saat
                        {org.last_scheduled_at
                          ? ` · ${formatShortDate(org.last_scheduled_at)}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">{formatInteger(org.downloads)}</td>
                    <td className="px-4 py-3">
                      <p>{formatInteger(org.schedule_starts)} başlatma</p>
                      <p className="text-[11px] text-slate-500">
                        {formatInteger(org.schedule_saves)} kayıt
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                      {formatShortDate(org.last_download_at)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                      {formatShortDate(
                        org.last_schedule_event_at ?? org.last_scheduled_at
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

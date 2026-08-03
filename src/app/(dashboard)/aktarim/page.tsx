"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useOrganization } from "@/components/OrganizationProvider";
import { parseExcelFile, type ParsedWorkbook } from "@/lib/excel-parser";
import { downloadTemplate, SHEET_NAMES } from "@/lib/excel-template";
import { importWorkbook } from "@/lib/excel-import";
import { DAY_NAMES } from "@/lib/types";

/**
 * Excel şablonuyla öğretmen, ders, sınıf ve dağılım verilerini toplu yükler.
 * Dağıtım sayfasından ayrı tutulur: veri girişi ile program üretimi farklı işlerdir.
 */
export default function AktarimPage() {
  const supabase = createClient();
  const toast = useToast();
  const { organizationId } = useOrganization();

  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const hasParseErrors = (parsed?.errors.length ?? 0) > 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImported(false);
    setImportLog([]);
    try {
      const result = parseExcelFile(await file.arrayBuffer());
      setParsed(result);
      if (result.errors.length > 0) {
        toast.error(
          `${result.errors.length} hata bulundu, aşağıdaki listeye bakın.`
        );
      } else {
        toast.success(
          "Dosya okundu, önizlemeyi kontrol edip aktarabilirsiniz."
        );
      }
    } catch (error) {
      setParsed(null);
      toast.error(`Excel dosyası okunamadı: ${(error as Error).message}`);
    } finally {
      e.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!parsed || parsed.errors.length > 0) return;
    setImporting(true);
    try {
      const log = await importWorkbook(supabase, parsed, organizationId);
      setImportLog(log);
      setImported(true);
      toast.success("Veriler veritabanına aktarıldı.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Excel İçe Aktarma"
        description="Şablonu doldurup öğretmen, ders, sınıf ve dağılım verilerini toplu yükleyin."
      />

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Dosya yükle
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Şablonu indirip doldurun, ardından yükleyin. Şablondaki her sayfa
            bir veri kümesine karşılık gelir:{" "}
            {Object.values(SHEET_NAMES).slice(1).join(", ")}.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => downloadTemplate()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Şablonu İndir
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg cursor-pointer hover:bg-sky-700 transition-colors text-sm font-medium">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Dosya Seç
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {fileName && (
              <span className="text-sm text-gray-500">{fileName}</span>
            )}
          </div>
        </div>

        {parsed && parsed.errors.length > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              Düzeltilmesi gereken {parsed.errors.length} hata
            </h3>
            <p className="text-xs text-red-600 mb-3">
              Hatalar giderilene kadar aktarım yapılamaz. Dosyayı düzeltip
              yeniden yükleyin.
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {parsed.errors.map((issue, i) => (
                <div key={i} className="text-xs text-red-700">
                  <span className="font-semibold">
                    {issue.sheet}
                    {issue.row ? ` · ${issue.row}. satır` : ""}
                  </span>
                  {" — "}
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed && parsed.warnings.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">
              {parsed.warnings.length} uyarı
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {parsed.warnings.map((issue, i) => (
                <div key={i} className="text-xs text-amber-700">
                  <span className="font-semibold">
                    {issue.sheet}
                    {issue.row ? ` · ${issue.row}. satır` : ""}
                  </span>
                  {" — "}
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Öğretmen", parsed.teachers.length, "text-orange-600"],
                ["Ders", parsed.subjects.length, "text-teal-600"],
                ["Sınıf", parsed.classes.length, "text-green-600"],
                [
                  "Ders-Sınıf Kaydı",
                  parsed.classSubjects.length,
                  "text-sky-600",
                ],
              ].map(([label, value, color]) => (
                <div
                  key={label as string}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
                >
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="text-sm text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Öğretmenler</h3>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-gray-500">
                        Ad Soyad
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Branş
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Verdiği Dersler
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        İzin Günleri
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.teachers.map((teacher) => (
                      <tr
                        key={teacher.name}
                        className="border-b border-gray-100"
                      >
                        <td className="py-2 px-3 text-gray-900">
                          {teacher.name}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {teacher.specialization || "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-xs">
                          {teacher.subjectNames.join(", ") || "—"}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1 flex-wrap">
                            {teacher.offDays.map((d) => (
                              <span
                                key={d}
                                className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded"
                              >
                                {DAY_NAMES[d]}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Sınıflar ve Ders Günleri
              </h3>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-gray-500">
                        Sınıf
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Seviye / Alan
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Günler ve Saatler
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Haftalık Saat
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.classes.map((cls) => {
                      const days = parsed.scheduleDays.filter(
                        (d) => d.className === cls.name
                      );
                      const hours = parsed.classSubjects
                        .filter((cs) => cs.className === cls.name)
                        .reduce((sum, cs) => sum + cs.weeklyHours, 0);
                      return (
                        <tr key={cls.name} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {cls.name}
                          </td>
                          <td className="py-2 px-3 text-gray-600 text-xs">
                            {[cls.level, cls.subgroup]
                              .filter(Boolean)
                              .join(" / ") || "—"}
                          </td>
                          <td className="py-2 px-3">
                            {days.length === 0 ? (
                              <span className="text-amber-600 text-xs italic">
                                Belirlenmemiş
                              </span>
                            ) : (
                              <div className="flex gap-1 flex-wrap">
                                {days.map((d) => (
                                  <span
                                    key={d.dayOfWeek}
                                    className="bg-sky-50 text-sky-700 text-xs px-2 py-0.5 rounded"
                                  >
                                    {DAY_NAMES[d.dayOfWeek]} {d.startTime}-
                                    {d.endTime}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {hours}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={importing || imported || hasParseErrors}
                className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing
                  ? "İçe Aktarılıyor..."
                  : imported
                    ? "İçe Aktarıldı"
                    : "Veritabanına Aktar"}
              </button>
              {hasParseErrors && (
                <span className="text-sm text-red-600">
                  Önce yukarıdaki hataları giderin.
                </span>
              )}
              {imported && (
                <Link
                  href="/dagitim"
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
                >
                  Otomatik dağıtıma geç
                </Link>
              )}
            </div>

            {importLog.length > 0 && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  İçe Aktarma Özeti
                </h4>
                <div className="space-y-0.5">
                  {importLog.map((line, i) => (
                    <div key={i} className="text-xs text-gray-600 font-mono">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-900">
          Verileri tek tek de girebilirsiniz:{" "}
          <Link href="/dersler" className="font-medium underline">
            Dersler
          </Link>
          ,{" "}
          <Link href="/ogretmenler" className="font-medium underline">
            Öğretmenler
          </Link>{" "}
          ve{" "}
          <Link href="/siniflar" className="font-medium underline">
            Sınıflar
          </Link>
          . Aktarım sonrası program üretmek için{" "}
          <Link href="/dagitim" className="font-medium underline">
            Otomatik Dağıtım
          </Link>{" "}
          sayfasını kullanın.
        </div>
      </div>
    </div>
  );
}

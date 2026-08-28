import TeacherSchedulesPage from "@/app/(dashboard)/ogretmen-programlari/page";
import Link from "next/link";

export default function V2OgretmenProgramlariPage() {
  return (
    <div className="space-y-3">
      <Link href="/v2" className="text-sm text-emerald-700 hover:underline">
        ← V2 ana sayfa
      </Link>
      <TeacherSchedulesPage edition="v2" />
    </div>
  );
}

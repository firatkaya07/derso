import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: classCount },
    { count: teacherCount },
    { count: subjectCount },
    { count: lessonCount },
  ] = await Promise.all([
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase.from("teachers").select("*", { count: "exact", head: true }),
    supabase.from("subjects").select("*", { count: "exact", head: true }),
    supabase.from("lessons").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Sinif", count: classCount ?? 0, color: "bg-blue-500", href: "/siniflar" },
    { label: "Ogretmen", count: teacherCount ?? 0, color: "bg-green-500", href: "/ogretmenler" },
    { label: "Ders", count: subjectCount ?? 0, color: "bg-purple-500", href: "/dersler" },
    { label: "Program Girisi", count: lessonCount ?? 0, color: "bg-orange-500", href: "/program" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Ana Sayfa</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-xl font-bold`}>
                {stat.count}
              </div>
              <div>
                <p className="text-sm text-gray-500">Toplam</p>
                <p className="text-lg font-semibold text-gray-900">{stat.label}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hizli Baslangic</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>1. Oncelikle <a href="/ogretmenler" className="text-blue-600 hover:underline font-medium">Ogretmenler</a> sayfasindan ogretmenlerinizi ekleyin.</p>
          <p>2. <a href="/dersler" className="text-blue-600 hover:underline font-medium">Dersler</a> sayfasindan ders/konu tanimlayamalari yapin.</p>
          <p>3. <a href="/siniflar" className="text-blue-600 hover:underline font-medium">Siniflar</a> sayfasindan siniflarinizi olusturun ve ders gunlerini/saatlerini belirleyin.</p>
          <p>4. <a href="/program" className="text-blue-600 hover:underline font-medium">Ders Programi</a> sayfasindan her sinif icin haftalik programi duzleyin.</p>
        </div>
      </div>
    </div>
  );
}

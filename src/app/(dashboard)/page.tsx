import Link from "next/link";

const cards = [
  {
    href: "/tanimlar",
    title: "Genel Tanımlar",
    description: "Kurum bilgileri, logo ve ders süreleri",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    borderColor: "border-l-indigo-400",
  },
  {
    href: "/dersler",
    title: "Dersler",
    description: "Ders tanımlamaları",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    borderColor: "border-l-teal-400",
  },
  {
    href: "/ogretmenler",
    title: "Öğretmenler",
    description: "Öğretmen tanımlamaları",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    borderColor: "border-l-orange-400",
  },
  {
    href: "/siniflar",
    title: "Sınıflar",
    description: "Sınıf ve ders atamaları",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    borderColor: "border-l-green-400",
  },
  {
    href: "/aktarim",
    title: "Excel İçe Aktarma",
    description: "Şablonla öğretmen, ders ve sınıf verilerini toplu yükle",
    icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    borderColor: "border-l-sky-400",
  },
  {
    href: "/dagitim",
    title: "Otomatik Dağıtım",
    description: "Kurallara göre haftalık programı otomatik oluştur",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    borderColor: "border-l-purple-400",
  },
  {
    href: "/program",
    title: "Sınıf Programları",
    description: "Sınıfların haftalık programı",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    borderColor: "border-l-teal-400",
  },
  {
    href: "/ogretmen-programlari",
    title: "Öğretmen Programları",
    description: "Öğretmenlerin haftalık programı",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    borderColor: "border-l-pink-400",
  },
  {
    href: "/indirme",
    title: "Program İndir",
    description: "PDF formatında program indir",
    icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    borderColor: "border-l-emerald-400",
  },
];

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={`bg-white rounded-xl border border-gray-200 border-l-4 ${card.borderColor} p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group`}
        >
          <div
            className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center mb-5`}
          >
            <svg
              className={`w-6 h-6 ${card.iconColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d={card.icon}
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
            {card.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}

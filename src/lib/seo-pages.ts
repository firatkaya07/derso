export type SeoSection = {
  heading: string;
  paragraphs: string[];
};

export type SeoPageDef = {
  path: string;
  h1: string;
  title: string;
  description: string;
  keywords: string[];
  kicker: string;
  intro: string[];
  sections: SeoSection[];
  related?: { href: string; label: string }[];
};

export const SEO_PAGES: SeoPageDef[] = [
  {
    path: "/otomatik-ders-programi",
    kicker: "Otomatik dağıtım",
    h1: "Otomatik Ders Programı Oluşturma",
    title: "Otomatik Ders Programı Oluşturma | Derso",
    description:
      "Öğretmen, sınıf ve ders bilgilerinizi girin; Derso çakışmaları kontrol ederek haftalık ders programınızı otomatik olarak oluştursun.",
    keywords: [
      "otomatik ders programı",
      "otomatik ders programı oluşturma",
      "otomatik ders dağıtımı",
      "ders programı otomatik hazırlama",
    ],
    intro: [
      "Haftalık ders programı hazırlamak saatler hatta günler sürebilir. Derso ile öğretmen, sınıf ve ders tanımlarınızı girdikten sonra programı otomatik olarak oluşturabilirsiniz.",
      "Sistem, belirlediğiniz kurallara göre dersleri yerleştirir; öğretmen ve sınıf çakışmalarını kontrol eder. Böylece ders dağıtım sürecini hızlandırır, manuel hataları azaltırsınız.",
    ],
    sections: [
      {
        heading: "Otomatik ders programı nasıl oluşturulur?",
        paragraphs: [
          "Derso'da öğretmenlerinizi, sınıflarınızı ve derslerinizi tanımladıktan sonra program oluşturma kurallarınızı belirleyebilirsiniz. Sistem bu bilgileri değerlendirerek uygun bir ders dağılımı oluşturur.",
          "Haftalık ders saatleri, öğretmen uygunlukları ve sınıf ihtiyaçları dikkate alınarak otomatik ders programı hazırlanır. Sonuçları sınıf ve öğretmen bazında hemen görebilirsiniz.",
        ],
      },
      {
        heading: "Öğretmen ve sınıf çakışmalarını önleyin",
        paragraphs: [
          "Aynı öğretmenin veya sınıfın aynı saatte birden fazla derse atanmasının önüne geçerek daha kontrollü programlar hazırlayın.",
          "Çakışma kontrolü, otomatik dağıtımın merkezinde yer alır. Böylece programı sonradan düzeltmek için harcadığınız zamanı kısaltırsınız.",
        ],
      },
      {
        heading: "Programı oluşturduktan sonra düzenleyin",
        paragraphs: [
          "Otomatik oluşturulan program üzerinde gerekli değişiklikleri manuel olarak gerçekleştirebilirsiniz.",
          "İnce ayar sonrası sınıf ve öğretmen programlarını Excel veya PDF olarak dışa aktarıp kurum içinde paylaşabilirsiniz.",
        ],
      },
    ],
    related: [
      { href: "/esnek-ders-programi", label: "Esnek ders programı" },
      { href: "/ogretmen-ders-programi", label: "Öğretmen ders programı" },
      { href: "/ders-programi-excel-pdf", label: "Excel ve PDF çıktı" },
      { href: "/blog/ders-programi-nasil-hazirlanir", label: "Ders programı nasıl hazırlanır?" },
    ],
  },
  {
    path: "/okul-ders-programi",
    kicker: "Okullar için",
    h1: "Okullar İçin Ders Programı Hazırlama Programı",
    title: "Okul Ders Programı Hazırlama Programı | Derso",
    description:
      "Okulunuzun haftalık ders programını Derso ile hazırlayın. Öğretmen, sınıf ve dersleri yönetin, çakışmaları önleyin ve programınızı kolayca oluşturun.",
    keywords: [
      "okul ders programı",
      "okul ders programı hazırlama",
      "okul ders programı hazırlama programı",
      "öğretmen ders dağılımı",
    ],
    intro: [
      "Okul ders programı hazırlamak; müfredat saatleri, öğretmen yükleri ve sınıf çakışmalarını aynı anda dengelemeyi gerektirir. Derso, okulunuz için bu süreci tek merkezden yönetmenizi sağlar.",
      "Ders programı hazırlama programı olarak Derso; tanımları bir kez girmenizi, otomatik dağıtım almanızı ve gerektiğinde elle düzenlemenizi mümkün kılar.",
    ],
    sections: [
      {
        heading: "Okul ders programınızı tek merkezden yönetin",
        paragraphs: [
          "Dersler, öğretmenler ve sınıflar aynı sistemde tutulur. Haftalık programı sınıf veya öğretmen görünümünde inceleyebilir, değişiklikleri anında yansıtabilirsiniz.",
        ],
      },
      {
        heading: "Öğretmen uygunluklarını belirleyin",
        paragraphs: [
          "Öğretmenlerin müsait olmadığı gün ve saatleri tanımlayarak daha gerçekçi bir öğretmen ders dağılımı oluşturun. Uygunluk kuralları otomatik dağıtıma dahil edilir.",
        ],
      },
      {
        heading: "Sınıfların haftalık ders saatlerini planlayın",
        paragraphs: [
          "Her sınıf için haftalık ders saatlerini tanımlayın; sistem bu hedeflere göre yerleştirmeyi dener. Açıkta kalan dersleri net biçimde görürsünüz.",
        ],
      },
      {
        heading: "Öğretmen ve sınıf programlarını ayrı görüntüleyin",
        paragraphs: [
          "Sınıf bazlı ve öğretmen bazlı program görünümleriyle iletişimi kolaylaştırın. İhtiyaca göre ilgili çıktıyı paylaşın veya yazdırın.",
        ],
      },
      {
        heading: "Excel ve PDF çıktısı alın",
        paragraphs: [
          "Hazır okul ders programını Excel veya PDF olarak dışa aktarın; yönetim, öğretmenler ve arşiv için kullanın.",
        ],
      },
    ],
    related: [
      { href: "/otomatik-ders-programi", label: "Otomatik ders programı" },
      { href: "/ogretmen-ders-programi", label: "Öğretmen ders programı" },
      { href: "/kurs-ders-programi", label: "Kurs ders programı" },
      { href: "/ders-programi-excel-pdf", label: "Excel ve PDF" },
    ],
  },
  {
    path: "/kurs-ders-programi",
    kicker: "Kurs merkezleri",
    h1: "Kurs Merkezleri İçin Ders Programı Hazırlama",
    title: "Kurs Ders Programı Hazırlama Programı | Derso",
    description:
      "Kurs merkezi, etüt merkezi ve eğitim kurumları için esnek ders programları oluşturun. Hafta sonu dahil haftanın 7 günü derslerinizi planlayın.",
    keywords: [
      "kurs ders programı",
      "kurs programı hazırlama",
      "kurs ders programı hazırlama programı",
      "etüt merkezi ders programı",
    ],
    intro: [
      "Kurs ve etüt merkezlerinde ders saatleri okullardan daha esnektir. Cumartesi–Pazar dersleri, farklı başlangıç saatleri ve değişken öğretmen müsaitlikleri sık görülür.",
      "Derso ile kurs ders programı hazırlama sürecini kuruma özel kurallara göre yönetebilir; haftanın 7 gününü tek programda toplayabilirsiniz.",
    ],
    sections: [
      {
        heading: "Kurslara özel esnek ders planlaması",
        paragraphs: [
          "Kurs merkezlerinde dersler her zaman standart okul saatlerinde gerçekleşmez. Derso ile farklı başlangıç ve bitiş saatlerine sahip ders programlarını yönetebilirsiniz.",
        ],
      },
      {
        heading: "Hafta sonu ders programı oluşturun",
        paragraphs: [
          "Cumartesi ve Pazar dahil olmak üzere haftanın 7 günü için ders planlaması yapabilirsiniz. Hafta içi ve hafta sonu derslerini aynı çizelgede takip edin.",
        ],
      },
      {
        heading: "Farklı öğretmen uygunluklarını yönetin",
        paragraphs: [
          "Part-time veya yoğun saatlerde çalışan öğretmenlerin uygunluklarını tanımlayın. Sistem bu kısıtlara göre otomatik dağıtım yapar.",
        ],
      },
      {
        heading: "Sınıf ve grupların programlarını oluşturun",
        paragraphs: [
          "Sınıf veya grup bazında programları oluşturun, çakışmaları kontrol edin ve gerektiğinde manuel düzenleme yapın.",
        ],
      },
      {
        heading: "Programınızı Excel ve PDF olarak paylaşın",
        paragraphs: [
          "Kurs ders programınızı Excel veya PDF olarak indirip öğretmenler ve veli iletişiminde kullanabilirsiniz.",
        ],
      },
    ],
    related: [
      { href: "/esnek-ders-programi", label: "Esnek ders programı" },
      { href: "/otomatik-ders-programi", label: "Otomatik ders programı" },
      { href: "/blog/kurs-ders-programi-nasil-hazirlanir", label: "Kurs ders programı rehberi" },
      { href: "/ders-programi-excel-pdf", label: "Excel ve PDF" },
    ],
  },
  {
    path: "/esnek-ders-programi",
    kicker: "Esnek planlama",
    h1: "Esnek Ders Programı Oluşturma ve Yönetme",
    title: "Esnek Ders Programı Oluşturma | Derso",
    description:
      "Farklı çalışma günleri, ders saatleri ve öğretmen uygunluklarına göre esnek ders programları oluşturun. Hafta sonu dahil tüm haftayı planlayın.",
    keywords: [
      "esnek ders programı",
      "haftalık ders planlama",
      "hafta sonu ders programı",
      "7 günlük ders programı",
    ],
    intro: [
      "Her kurumun çalışma düzeni aynı değildir. Esnek ders programı ile günleri, saatleri ve öğretmen uygunluklarını kendi işleyişinize göre tanımlarsınız.",
      "Derso; hafta sonu dersleri, değişken ders saatleri ve kurum özel kurallarını destekleyerek 7 günlük planlamayı kolaylaştırır.",
    ],
    sections: [
      {
        heading: "Kurumunuza göre çalışma günlerini belirleyin",
        paragraphs: [
          "Haftanın hangi günlerinde ders yapıldığını tanımlayın. Okul, kurs veya etüt düzeninize uygun esnek bir çerçeve oluşturun.",
        ],
      },
      {
        heading: "Cumartesi ve Pazar günlerini programa dahil edin",
        paragraphs: [
          "Hafta sonu ders programı ihtiyacınız varsa Cumartesi ve Pazar'ı çizelgeye ekleyin. 7 günlük ders programını tek yerden yönetin.",
        ],
      },
      {
        heading: "Farklı ders saatlerini yönetin",
        paragraphs: [
          "Standart ders dilimlerinin dışında kalan saatleri de planlayabilirsiniz. Kurumunuza özel saat dilimleriyle haftalık ders planlaması yapın.",
        ],
      },
      {
        heading: "Öğretmenlerin uygun olmadığı saatleri belirleyin",
        paragraphs: [
          "Öğretmen müsaitliklerini tanımlayarak dağıtımın gerçekçi kalmasını sağlayın. Uygun olmayan saatlere ders atanmasını engelleyin.",
        ],
      },
      {
        heading: "Program üzerinde istediğiniz değişiklikleri yapın",
        paragraphs: [
          "Otomatik oluşturulan esnek programı manuel olarak düzenleyebilir; gün ve saat değişikliklerini hızlıca uygulayabilirsiniz.",
        ],
      },
    ],
    related: [
      { href: "/kurs-ders-programi", label: "Kurs ders programı" },
      { href: "/otomatik-ders-programi", label: "Otomatik ders programı" },
      { href: "/blog/hafta-sonu-ders-programi-hazirlama", label: "Hafta sonu ders programı" },
      { href: "/ogretmen-ders-programi", label: "Öğretmen ders programı" },
    ],
  },
  {
    path: "/ogretmen-ders-programi",
    kicker: "Öğretmen planlama",
    h1: "Öğretmen Ders Programı Oluşturma",
    title: "Öğretmen Ders Programı Hazırlama ve Oluşturma | Derso",
    description:
      "Öğretmenlerin haftalık derslerini kolayca planlayın. Müsaitlik saatlerini belirleyin, ders çakışmalarını önleyin ve öğretmen programlarını oluşturun.",
    keywords: [
      "öğretmen ders programı",
      "öğretmen ders programı hazırlama",
      "öğretmen ders programı oluşturma",
      "öğretmen ders dağılımı",
    ],
    intro: [
      "Öğretmen ders programı hazırlama; ders yükü, uygunluk ve sınıf çakışmalarını birlikte düşünmeyi gerektirir. Derso ile öğretmen ders dağılımını sistematik şekilde yönetirsiniz.",
      "Her öğretmen için haftalık programı görüntüleyebilir, Excel veya PDF olarak paylaşabilirsiniz.",
    ],
    sections: [
      {
        heading: "Öğretmen müsaitliklerini tanımlayın",
        paragraphs: [
          "Öğretmenlerin uygun olduğu ve olmadığı gün/saatleri belirleyin. Bu kısıtlar otomatik ders programı oluşturma sürecine dahil edilir.",
        ],
      },
      {
        heading: "Çakışmasız öğretmen ders dağılımı",
        paragraphs: [
          "Aynı öğretmenin aynı saatte birden fazla derse yazılmasını engelleyerek öğretmen ders programı oluşturmayı güvenli hale getirin.",
        ],
      },
      {
        heading: "Öğretmen bazlı program görünümü",
        paragraphs: [
          "Öğretmen ders programını kişi bazında inceleyin. Yoğunlukları görün, gerekirse manuel düzenleme yapın.",
        ],
      },
      {
        heading: "Programı öğretmenlerle paylaşın",
        paragraphs: [
          "Hazır öğretmen programlarını Excel veya PDF olarak dışa aktarıp hızlıca iletebilirsiniz.",
        ],
      },
    ],
    related: [
      { href: "/otomatik-ders-programi", label: "Otomatik ders programı" },
      { href: "/okul-ders-programi", label: "Okul ders programı" },
      { href: "/ders-programi-excel-pdf", label: "Excel ve PDF" },
    ],
  },
  {
    path: "/ders-programi-excel-pdf",
    kicker: "Dışa aktarım",
    h1: "Ders Programınızı Excel ve PDF Olarak Oluşturun",
    title: "Excel ve PDF Ders Programı Oluşturma | Derso",
    description:
      "Hazırladığınız öğretmen ve sınıf ders programlarını Excel ve PDF formatında dışa aktarın, paylaşın, yazdırın ve kolayca arşivleyin.",
    keywords: [
      "Excel ders programı",
      "Excel ders programı hazırlama",
      "PDF ders programı",
      "ders programı Excel",
      "ders programı PDF",
    ],
    intro: [
      "Ders programını yalnızca ekranda görmek yetmez; kurum içinde paylaşmak ve arşivlemek de gerekir. Derso ile sınıf ve öğretmen programlarını Excel ve PDF olarak dışa aktarabilirsiniz.",
      "Excel ders programı hazırlama ihtiyacı olan ekipler için veri aktarımı ve çıktı alma aynı ürün içinde birleşir.",
    ],
    sections: [
      {
        heading: "Excel olarak dışa aktarın",
        paragraphs: [
          "Hazırladığınız ders programını Excel formatında indirerek düzenleme, paylaşım veya arşivleme için kullanın. Toplu veri aktarımında da Excel şablonlarından yararlanabilirsiniz.",
        ],
      },
      {
        heading: "PDF ders programı oluşturun",
        paragraphs: [
          "Yazdırılabilir PDF ders programı ile sınıf panoları, öğretmen dosyaları ve resmi paylaşım ihtiyaçlarını karşılayın.",
        ],
      },
      {
        heading: "Sınıf ve öğretmen çıktılarını ayrı alın",
        paragraphs: [
          "İhtiyaca göre sınıf bazlı veya öğretmen bazlı Excel/PDF çıktıları üretin. Çarşaf listeleriyle birlikte kullanın.",
        ],
      },
      {
        heading: "Manuel Excel yönetiminin ötesine geçin",
        paragraphs: [
          "Yalnızca Excel'de ders programı tutmak çakışma kontrolünü ve güncellemeyi zorlaştırır. Derso'da programı oluşturup ardından Excel/PDF alın; güncel çıktıyı her seferinde yeniden üretin.",
        ],
      },
    ],
    related: [
      { href: "/otomatik-ders-programi", label: "Otomatik ders programı" },
      { href: "/blog/excel-ders-programi-hazirlama", label: "Excel'de ders programı rehberi" },
      { href: "/okul-ders-programi", label: "Okul ders programı" },
    ],
  },
];

export function getSeoPage(path: string): SeoPageDef | undefined {
  return SEO_PAGES.find((p) => p.path === path);
}

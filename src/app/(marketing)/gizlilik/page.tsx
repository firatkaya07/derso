import type { Metadata } from "next";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/landing/MarketingChrome";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

const CONTACT_EMAIL = "firatkaya.bil@gmail.com";
const UPDATED_AT = "2026-10-16";

export const metadata: Metadata = {
  title: { absolute: `Gizlilik Politikası | ${SITE_NAME}` },
  description:
    "Derso web ve mobil uygulamasının hangi kişisel verileri topladığı, nasıl kullandığı ve hesabınızı nasıl silebileceğiniz.",
  alternates: { canonical: "/gizlilik" },
  openGraph: {
    title: `Gizlilik Politikası | ${SITE_NAME}`,
    url: `${getSiteUrl()}/gizlilik`,
    type: "website",
    locale: "tr_TR",
  },
};

export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <div className="landing">
      <MarketingNav />
      <main id="icerik">
        <article className="landing-blog-article">
          <header className="landing-seo-hero landing-seo-hero--article">
            <div className="landing-seo-hero__inner">
              <p className="landing-kicker">Yasal</p>
              <h1 className="landing-seo-hero__title">Gizlilik Politikası</h1>
              <p className="landing-seo-hero__intro">
                Derso web uygulaması (dersomatik.com) ve Derso mobil
                uygulaması (iOS ve Android) için geçerlidir.
              </p>
              <time dateTime={UPDATED_AT}>
                Son güncelleme:{" "}
                {new Date(UPDATED_AT).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          </header>

          <div className="landing-blog-prose">
            <h2>1. Veri sorumlusu</h2>
            <p>
              Bu politika kapsamındaki kişisel veriler bakımından veri
              sorumlusu Fırat Kaya&apos;dır (&quot;Derso&quot;, &quot;biz&quot;).
              Her türlü soru ve talebiniz için: {mail}
            </p>

            <h2>2. Topladığımız veriler</h2>
            <ul>
              <li>
                <strong>Hesap bilgileri:</strong> e-posta adresiniz ve
                şifreniz. Şifreler yalnızca şifrelenmiş (hash) olarak saklanır;
                biz dahil kimse açık hâlini göremez.
              </li>
              <li>
                <strong>Kurum verileri:</strong> kurumunuzun adı, il ve ilçesi,
                müdür ve müdür yardımcısı adları, logo; öğretmenlerin adı,
                branşı ve (girilmişse) telefon numarası ile e-posta adresi;
                sınıf, ders ve ders programı bilgileri. Bu verileri kurum
                kullanıcısı kendisi girer. Öğrencilere ait kişisel veri
                toplanmaz.
              </li>
              <li>
                <strong>Destek yazışmaları:</strong> uygulama içi destek
                formundan gönderdiğiniz mesajlar ve eklediğiniz dosyalar.
              </li>
              <li>
                <strong>Kullanım kayıtları:</strong> program oluşturma,
                kaydetme ve dosya indirme gibi işlemlerin zamanı ve türü.
                Hizmeti geliştirmek ve sorunları tespit etmek için kullanılır.
              </li>
              <li>
                <strong>Web analitiği:</strong> dersomatik.com&apos;da Google
                Analytics ile ziyaret edilen sayfalar, tarayıcı ve cihaz türü,
                yaklaşık konum (şehir/ülke) gibi bilgiler çerezler aracılığıyla
                toplanır. Vercel Speed Insights sayfa yükleme hızını ölçer.
              </li>
              <li>
                <strong>Mobil uygulama:</strong> mobil uygulama web ile aynı
                hesabı kullanır. Oturumunuzun açık kalması için oturum bilgisi
                cihazınızda saklanır. Mobil uygulamada analitik ya da reklam
                aracı bulunmaz; konum, kişiler, kamera veya mikrofon izni
                istenmez.
              </li>
            </ul>

            <h2>3. Verileri ne için kullanıyoruz</h2>
            <ul>
              <li>Hesabınızı oluşturmak ve oturum açmanızı sağlamak,</li>
              <li>
                ders programlarını hazırlamak, saklamak ve Excel/PDF çıktısı
                üretmek,
              </li>
              <li>destek taleplerinize yanıt vermek,</li>
              <li>hizmetin güvenliğini sağlamak ve hataları gidermek,</li>
              <li>sitenin nasıl kullanıldığını anlayıp geliştirmek.</li>
            </ul>
            <p>
              Verileriniz reklam amacıyla kullanılmaz ve satılmaz. Bu işlemeler
              6698 sayılı KVKK&apos;nın 5. maddesindeki sözleşmenin kurulması
              ve ifası ile meşru menfaat hukuki sebeplerine dayanır.
            </p>
            <p>
              Kurumların girdiği öğretmen bilgileri bakımından Derso, kurum
              adına veri işleyen konumundadır; bu verilerin doğruluğu ve
              ilgili kişilerin bilgilendirilmesi kurumun sorumluluğundadır.
            </p>

            <h2>4. Verilerin paylaşıldığı taraflar</h2>
            <p>
              Verileriniz yalnızca hizmeti sunmak için çalıştığımız şu altyapı
              sağlayıcılarıyla paylaşılır:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong>: veritabanı, kimlik doğrulama ve dosya
                depolama,
              </li>
              <li>
                <strong>Vercel</strong>: web sitesinin barındırılması ve
                performans ölçümü,
              </li>
              <li>
                <strong>Google</strong>: web analitiği (Google Analytics),
              </li>
              <li>
                <strong>Expo</strong>: mobil uygulamanın derlenmesi ve
                dağıtılması (kişisel veriniz aktarılmaz).
              </li>
            </ul>
            <p>
              Bu sağlayıcıların sunucuları yurt dışında bulunabilir; bu nedenle
              verileriniz hizmetin sunulması amacıyla yurt dışına aktarılabilir.
              Kanunen yetkili kurumların talebi dışında verileriniz üçüncü
              kişilerle paylaşılmaz.
            </p>

            <h2>5. Güvenlik ve saklama süresi</h2>
            <p>
              Veriler şifreli bağlantı (HTTPS) üzerinden iletilir. Her kurumun
              verisi yalnızca o kurumun üyelerine açıktır. Verileriniz
              hesabınız açık olduğu sürece saklanır; hesabınızı silmenizin
              ardından aşağıdaki süre içinde silinir.
            </p>

            <h2 id="hesap-silme">6. Hesabınızı ve verilerinizi silme</h2>
            <p>
              Hesabınızın ve kurumunuza ait tüm verilerin silinmesini istemek
              için kayıtlı e-posta adresinizden {mail} adresine &quot;Hesap
              silme talebi&quot; konulu bir e-posta gönderin. Talebiniz en geç
              30 gün içinde yerine getirilir ve size bilgi verilir. Silme
              işlemi geri alınamaz; ihtiyaç duyuyorsanız öncesinde
              programlarınızı Excel/PDF olarak indirin.
            </p>
            <p>
              Hesabınızı silmeden yalnızca belirli verilerin (örneğin bir
              öğretmenin iletişim bilgilerinin) silinmesini de aynı adresten
              isteyebilirsiniz; kurum verilerinizin çoğunu uygulama içinden de
              kendiniz silebilirsiniz.
            </p>

            <h2>7. Haklarınız</h2>
            <p>
              KVKK&apos;nın 11. maddesi uyarınca kişisel verilerinizin işlenip
              işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya
              silinmesini isteme, aktarıldığı tarafları öğrenme ve itiraz etme
              haklarına sahipsiniz. Taleplerinizi {mail} adresine
              iletebilirsiniz; en geç 30 gün içinde yanıtlanır.
            </p>

            <h2>8. Çocukların gizliliği</h2>
            <p>
              Derso okul ve kurs yöneticilerine yönelik bir hizmettir. 13 yaşından
              küçüklerden bilerek kişisel veri toplamayız.
            </p>

            <h2>9. Değişiklikler</h2>
            <p>
              Bu politikayı güncellediğimizde yeni sürümü bu sayfada
              yayınlar ve yukarıdaki tarihi değiştiririz.
            </p>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}

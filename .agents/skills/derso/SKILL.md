---
name: derso
description: Derso ürün kuralları — V1/V2 program, çok kurumlu yapı, Türkçe arayüz, çizelgeleme, admin, Excel/PDF çıktı. Ders, öğretmen, sınıf, dağıtım, indirme, tanım, rapor veya Supabase değişikliğinde kullan.
---

# Derso

Kurs merkezleri ve okullar için haftalık ders programı. Agent bu skill’i özellik, hata, kopya veya şema işlerinde okusun.

## Ürün

- **Kullanıcı:** kurum yöneticisi. Arayüz ve kullanıcıya görünen metin **Türkçe**.
- **Yığın:** Next.js 16 App Router, React 19, Tailwind 4, TypeScript, Supabase (Postgres + Auth + RLS).
- Next.js API’si eğitim verisinden farklı olabilir. Kod yazmadan önce `node_modules/next/dist/docs/` içindeki ilgili kılavuzu oku.

## Ne zaman hangi yüzey

| Alan | Yer |
| --- | --- |
| Pazarlama / SEO | `src/app/(marketing)/` |
| Giriş / onboarding | `src/app/login`, `src/app/onboarding` |
| Uygulama (V1) | `src/app/(dashboard)/` — `/home`, `/tanimlar`, `/dersler`, `/ogretmenler`, `/siniflar`, `/aktarim`, `/dagitim`, `/program`, `/indirme` |
| Uygulama (V2) | `src/app/(dashboard)/v2/` — aynı iş, ayrı zaman çizelgesi ve `lessons_v2` |
| Platform admin | `src/app/(admin)/admin/` — kurumlar, kullanıcılar, destek, raporlar. Platform admin `/admin`’e düşer, kurum dashboard’unu görmez |
| Ortak UI | `src/components/` (`Modal`, `Toast`, `ScheduleGrid`, `Header`, `EditionSwitcher`) |
| İş kuralları | `src/lib/` — `scheduler/`, `schedule-rules.ts`, `excel-*`, `pdf-generator.ts`, `edition.ts`, `admin.ts` |

Paylaşılan tanımlar (ders / öğretmen / sınıf / Excel aktarım) V1 ve V2’de aynıdır. Program, dağıtım, tanım saatleri, indirme **sürüme göre ayrıdır**.

## V1 / V2

- Sürüm tipi: `ScheduleEdition` = `"v1" | "v2"` (`src/lib/edition.ts`).
- Rota çevirisi: `pathForEdition`, `editionOfPath`, `homeHref`, `tanimlarHref`. Yeni sürümlü sayfa eklerken `VERSIONED_ROUTES` listesini güncelle.
- V1 programı `lessons`, V2 `lessons_v2`. Birini değiştirirken diğerini sessizce bozma; mümkünse her iki akışı da doğrula.
- Kullanıcı tercihi `user_preferences`; geçiş header’daki `EditionSwitcher`.
- Giriş sonrası tanıtım: `EditionIntroModal` + `derso:edition-intro:v1` (localStorage). Platform admin bu pencereyi görmez.

## Veri ve güvenlik

- Çok kurumlu. Her satır `organization_id` ile izole. İstemci `anon` anahtarı taşır; **asıl koruma RLS**.
- Kurum oluşturma yalnızca `create_organization` RPC. Üyelik insert’i istemciden açma.
- RSC’de üyelik / ayar / alan: `getRequestMembership`, `getRequestSettings`, `getRequestFields` (`src/lib/cache/request.ts`). Aynı istekte tekrar sorgu atma.
- Yazma sonrası (Excel, program kaydı, genel tanımlar) `invalidateOrgClientCache(organizationId)`.
- Admin RPC’ler (`admin_*`, `is_platform_admin`, `record_usage_event`) `anon` execute almasın. Yeni RPC’de aynı kuralı uygula.
- Şema: `supabase/migrations/` — sıradaki numara (`0019_...`). Tabloya RLS koy. View kullanırsan `security_invoker`. `service_role` istemciye çıkmasın.
- Günler: `0` Pazartesi … `6` Pazar. Her yerde aynı.

## Çizelgeleme

- Çözücü tarayıcıda: `src/lib/scheduler/`. Sert kısıtlar (çakışma, izin günü, tek öğretmen / ders, günde en fazla 2 saat aynı ders) kırılmaz.
- Elle yerleştirme kuralları `schedule-rules.ts`; DB tekilliği son söz (`lessons_*_slot_unique`).
- Dağıtım / indirme kullanımını `reportUsage()` ile yaz (`download`, `schedule_start`, `schedule_complete`, `schedule_save`). GA’nın yerine geçmez; hata kullanıcı işini bozmasın.
- Çıktılar PDF binary değil, yazdırılabilir HTML’dir (`pdf-generator.ts`). Türkçe karakter için bilinçli tercih.

## Arayüz

- Metin: Türkçe, sade, resmi olmayan. İyelik ekleri ve “program yayılımı / dağıtımı” gibi ürün terimlerinde mevcut kopyayı taklit et.
- Renk: `src/app/globals.css` token’ları (`--color-primary` indigo, `--color-accent` emerald). Ham `#6366F1` tekrarlama; `bg-[var(--color-primary)]` kullan.
- Yeni UI kütüphanesi ekleme. Mevcut `Modal`, `Toast`, ızgara ve buton stillerini kullan.
- Etkileşimli öğede `cursor-pointer` (global CSS var). Odak: `focus-visible`. Animasyon: `prefers-reduced-motion`.
- Dashboard `robots: noindex`. Pazarlama sayfaları index’lenir.

## Test ve doğrulama

- Birim test: Vitest, `tests/*.test.ts`. Çizelge / kural / edition / admin metrik değişince ilgili testi güncelle veya ekle. `npm test`.
- UI, layout, rota veya görünür metin değiştiyse tarayıcıda asıl akışı tıkla (tek ekran görüntüsü yetmez). V1 ve V2 paylaşılıyorsa her iki rotayı da bak.
- Scheduler senaryoları: `tests/scheduler-scenarios.test.ts`. İhlal sayısı sıfır kalmalı.

## Yapılmaması gerekenler

- V1 ve V2’yi tek tabloda karıştırma.
- RLS’i “geçici” kapatma veya `organization_id` filtresini unutma.
- Kullanıcıya İngilizce buton / hata metni koyma (kod ve commit İngilizce/Türkçe karışık olabilir; UI Türkçe).
- `npm audit fix --force` ile Next sürümünü düşürme.
- Cloud Agent için skill’i yalnızca home dizinine koyma; proje skill’i `.cursor/skills/` ve `.agents/skills/` altında durur.

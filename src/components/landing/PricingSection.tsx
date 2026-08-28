"use client";

import { useState } from "react";
import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";
import { PRICING_PLANS, formatTry } from "./pricing";

export default function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  return (
    <section
      id="ucretlendirme"
      className="landing-section landing-pricing"
      aria-labelledby="landing-pricing-title"
    >
      <div className="landing-section__inner">
        <p className="landing-kicker">Ücretlendirme</p>
        <h2 id="landing-pricing-title" className="landing-section__title">
          Kurumunuza uygun paket
        </h2>
        <p className="landing-section__lede">
          Şeffaf fiyatlar, gizli ücret yok. İstediğiniz zaman yükseltin.
          Fiyatlara KDV dahil değildir.
        </p>

        <div className="landing-pricing__promo" role="status">
          <p className="landing-pricing__promo-eyebrow">Şu an ücretsiz</p>
          <p className="landing-pricing__promo-title">
            Bugün kayıt ol, <strong>3 ay ücretsiz</strong> kullan
          </p>
          <p className="landing-pricing__promo-copy">
            Kampanya süresince tüm paketler 3 ay boyunca ücretsiz. Kart
            gerekmez — hemen başlayın.
          </p>
          <TrackedLink
            href="/login"
            className="landing-btn landing-btn--accent landing-pricing__promo-cta"
            trackLocation="pricing"
            trackLead
            trackLabel="3 ay ücretsiz kayıt"
          >
            Ücretsiz kayıt ol
          </TrackedLink>
        </div>

        <div
          className="landing-pricing__billing"
          role="group"
          aria-label="Faturalama dönemi"
        >
          <button
            type="button"
            className={billing === "monthly" ? "is-active" : undefined}
            onClick={() => setBilling("monthly")}
            aria-pressed={billing === "monthly"}
          >
            Aylık
          </button>
          <button
            type="button"
            className={billing === "yearly" ? "is-active" : undefined}
            onClick={() => setBilling("yearly")}
            aria-pressed={billing === "yearly"}
          >
            Yıllık
            <span className="landing-pricing__save">2 ay bedava</span>
          </button>
        </div>

        <div className="landing-pricing__grid">
          {PRICING_PLANS.map((plan) => {
            const amount =
              billing === "yearly"
                ? Math.round(plan.priceYearly / 12)
                : plan.priceMonthly;
            return (
              <article
                key={plan.id}
                className={`landing-pricing__plan${plan.featured ? " is-featured" : ""}`}
              >
                {plan.featured && (
                  <p className="landing-pricing__badge">En çok tercih</p>
                )}
                <h3>{plan.name}</h3>
                <p className="landing-pricing__blurb">{plan.blurb}</p>
                <p className="landing-pricing__price">
                  <span className="landing-pricing__amount">
                    {formatTry(amount)}
                  </span>
                  <span className="landing-pricing__period">/ ay</span>
                </p>
                {billing === "yearly" && (
                  <p className="landing-pricing__yearly-note">
                    Yıllık {formatTry(plan.priceYearly)} faturalandırılır
                  </p>
                )}
                <ul className="landing-pricing__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <TrackedLink
                  href="/login"
                  className={`landing-btn ${
                    plan.featured
                      ? "landing-btn--accent"
                      : "landing-btn--pricing"
                  }`}
                  trackLocation="pricing"
                  trackLead
                  trackPlan={plan.id}
                  trackBilling={billing}
                  trackLabel={plan.cta}
                >
                  {plan.cta}
                </TrackedLink>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

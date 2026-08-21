"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { trackCtaClick, trackGenerateLead } from "@/lib/analytics";

type Props = ComponentProps<typeof Link> & {
  /** CTA konumu — örn. hero, nav, pricing, seo_footer */
  trackLocation?: string;
  /** Lead (ücretsiz başla / kayıt) olarak işaretle */
  trackLead?: boolean;
  trackLabel?: string;
  trackPlan?: string;
  trackBilling?: string;
};

/** Marketing CTA linkleri — tıklamada GA etkinliği gönderir. */
export default function TrackedLink({
  trackLocation,
  trackLead,
  trackLabel,
  trackPlan,
  trackBilling,
  onClick,
  children,
  ...rest
}: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (trackLead && trackLocation) {
      trackGenerateLead({
        location: trackLocation,
        plan: trackPlan,
        billing: trackBilling,
      });
    } else if (trackLocation) {
      trackCtaClick(trackLocation, trackLabel);
    }
    onClick?.(event);
  };

  return (
    <Link {...rest} onClick={handleClick}>
      {children}
    </Link>
  );
}

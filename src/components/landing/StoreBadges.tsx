import TrackedLink from "@/components/TrackedLink";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/site";

type StoreBadgesProps = {
  /** GA konum etiketi — örn. hero, footer */
  location: string;
};

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 12.77c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 6.02c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.05-.52 2.69-1.27z"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#34A853" d="M3.6 2.2 13.4 12l-9.8 9.8c-.35-.2-.6-.6-.6-1.1V3.3c0-.5.25-.9.6-1.1z" />
      <path fill="#FBBC04" d="m16.8 15.4-3.4-3.4 3.4-3.4 3.9 2.2c.9.5.9 1.8 0 2.3z" />
      <path fill="#EA4335" d="M3.6 21.8 13.4 12l3.4 3.4-11.6 6.6c-.6.3-1.2.2-1.6-.2z" />
      <path fill="#4285F4" d="M3.6 2.2c.4-.4 1-.5 1.6-.2l11.6 6.6-3.4 3.4z" />
    </svg>
  );
}

/** Mobil uygulama mağaza indirme rozetleri. */
export default function StoreBadges({ location }: StoreBadgesProps) {
  return (
    <div className="landing-stores" aria-label="Mobil uygulamayı indirin">
      <TrackedLink
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="landing-store"
        trackLocation={location}
        trackLabel="app_store"
      >
        <AppleIcon />
        <span className="landing-store__text">
          <span className="landing-store__eyebrow">İndirin</span>
          <span className="landing-store__name">App Store</span>
        </span>
      </TrackedLink>
      {GOOGLE_PLAY_URL ? (
        <TrackedLink
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="landing-store"
          trackLocation={location}
          trackLabel="google_play"
        >
          <PlayIcon />
          <span className="landing-store__text">
            <span className="landing-store__eyebrow">Hemen alın</span>
            <span className="landing-store__name">Google Play</span>
          </span>
        </TrackedLink>
      ) : null}
    </div>
  );
}

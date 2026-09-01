/** Klavye kullanıcıları için ilk odaklanabilir atlama bağlantısı. */
export default function SkipToContent({
  href = "#icerik",
}: {
  href?: string;
}) {
  return (
    <a href={href} className="skip-to-content">
      İçeriğe geç
    </a>
  );
}

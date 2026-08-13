/** Hero’daki ürün görseli: haftalık program ızgarası mockup’ı. */
export default function ScheduleHeroVisual() {
  const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const hours = ["09:00", "09:50", "10:40", "11:30", "13:00", "13:50"];

  const cells: Record<string, { label: string; teacher: string; tone: string } | null> = {
    "0-0": { label: "MAT", teacher: "A. Yılmaz", tone: "tone-a" },
    "0-1": { label: "MAT", teacher: "A. Yılmaz", tone: "tone-a" },
    "0-2": { label: "FİZ", teacher: "B. Kaya", tone: "tone-b" },
    "0-4": { label: "TR", teacher: "C. Demir", tone: "tone-c" },
    "1-0": { label: "KİM", teacher: "D. Şahin", tone: "tone-d" },
    "1-1": { label: "KİM", teacher: "D. Şahin", tone: "tone-d" },
    "1-3": { label: "MAT", teacher: "A. Yılmaz", tone: "tone-a" },
    "1-4": { label: "MAT", teacher: "A. Yılmaz", tone: "tone-a" },
    "2-0": { label: "TR", teacher: "C. Demir", tone: "tone-c" },
    "2-1": { label: "TR", teacher: "C. Demir", tone: "tone-c" },
    "2-2": { label: "BİY", teacher: "E. Arslan", tone: "tone-e" },
    "2-5": { label: "FİZ", teacher: "B. Kaya", tone: "tone-b" },
    "3-1": { label: "MAT", teacher: "A. Yılmaz", tone: "tone-a" },
    "3-2": { label: "MAT", teacher: "A. Yılmaz", tone: "tone-a" },
    "3-4": { label: "KİM", teacher: "D. Şahin", tone: "tone-d" },
    "4-0": { label: "BİY", teacher: "E. Arslan", tone: "tone-e" },
    "4-2": { label: "TR", teacher: "C. Demir", tone: "tone-c" },
    "4-3": { label: "TR", teacher: "C. Demir", tone: "tone-c" },
    "5-0": { label: "MAT", teacher: "A. Yılmaz", tone: "tone-a" },
    "5-1": { label: "FİZ", teacher: "B. Kaya", tone: "tone-b" },
    "5-2": { label: "FİZ", teacher: "B. Kaya", tone: "tone-b" },
  };

  return (
    <div className="landing-hero-visual" aria-hidden="true">
      <div className="landing-hero-visual__chrome">
        <div className="landing-hero-visual__dots">
          <span />
          <span />
          <span />
        </div>
        <p className="landing-hero-visual__title">11-A · Haftalık Program</p>
        <p className="landing-hero-visual__badge">%98 yerleşti</p>
      </div>

      <div className="landing-hero-visual__grid">
        <div className="landing-hero-visual__corner" />
        {days.map((day) => (
          <div key={day} className="landing-hero-visual__day">
            {day}
          </div>
        ))}

        {hours.map((hour, row) => (
          <div key={hour} className="landing-hero-visual__row">
            <div className="landing-hero-visual__hour">{hour}</div>
            {days.map((_, col) => {
              const cell = cells[`${col}-${row}`];
              return (
                <div
                  key={`${col}-${row}`}
                  className={`landing-hero-visual__cell ${cell ? `is-filled ${cell.tone}` : ""}`}
                  style={{ animationDelay: `${(row * 6 + col) * 28}ms` }}
                >
                  {cell && (
                    <>
                      <span className="landing-hero-visual__subject">{cell.label}</span>
                      <span className="landing-hero-visual__teacher">{cell.teacher}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

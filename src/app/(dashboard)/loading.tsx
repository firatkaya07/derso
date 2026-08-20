export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Yükleniyor">
      <div className="h-8 w-48 rounded-lg bg-slate-200/80" />
      <div className="h-4 w-72 max-w-full rounded bg-slate-200/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-slate-200/80 bg-white"
          >
            <div className="m-5 h-3 w-24 rounded bg-slate-100" />
            <div className="mx-5 mt-4 h-8 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

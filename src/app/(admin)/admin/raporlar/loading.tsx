export default function AdminReportsLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Yükleniyor">
      <div className="h-8 w-56 rounded-lg bg-slate-200" />
      <div className="h-4 w-72 max-w-full rounded bg-slate-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-4 h-8 w-14 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="h-52 rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}

export default function MarketingLoading() {
  return (
    <div className="landing min-h-[50vh] px-5 py-16" aria-busy="true" aria-label="Yükleniyor">
      <div className="mx-auto max-w-3xl animate-pulse space-y-4">
        <div className="h-3 w-24 rounded bg-teal-900/10" />
        <div className="h-10 w-3/4 max-w-md rounded-lg bg-teal-900/10" />
        <div className="h-4 w-full rounded bg-teal-900/5" />
        <div className="h-4 w-5/6 rounded bg-teal-900/5" />
      </div>
    </div>
  );
}

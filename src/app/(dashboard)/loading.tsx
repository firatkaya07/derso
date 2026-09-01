export default function DashboardLoading() {
  return (
    <div className="ios-grouped max-w-xl" aria-busy="true" aria-label="Yükleniyor">
      <div>
        <div className="skeleton mb-2 h-10 w-48" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </div>
      <div>
        <div className="skeleton mb-2 h-3 w-20" />
        <div className="ios-inset">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ios-row">
              <div className="skeleton h-8 w-8 shrink-0 rounded-[8px]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-48 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

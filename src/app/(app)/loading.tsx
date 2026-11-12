export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-12 w-72 animate-pulse rounded-xl bg-surface-2" />
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}

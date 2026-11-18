import { NudgeLoader, Shimmer } from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10" aria-busy="true" aria-label="Loading">
      <div className="fade-in-late mb-6 flex items-center gap-3">
        <NudgeLoader size={30} />
        <Shimmer className="h-4 w-28 rounded-full" />
      </div>
      <Shimmer className="h-10 w-64 max-w-full rounded-2xl sm:h-12 sm:w-72" />
      <div className="mt-8 grid gap-4 sm:gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} className="h-44 rounded-3xl sm:h-48 sm:rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}

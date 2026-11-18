import { NudgeLoader, Shimmer } from "@/components/ui/loader";

// Switching between squad tabs keeps the tab row and shows this underneath.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8" aria-busy="true" aria-label="Loading">
      <div className="fade-in-late mb-5 flex items-center gap-3">
        <NudgeLoader size={28} />
        <Shimmer className="h-8 w-48 rounded-2xl" />
      </div>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Shimmer className="h-56 rounded-3xl sm:rounded-[var(--radius-card)]" />
        <Shimmer className="h-56 rounded-3xl sm:rounded-[var(--radius-card)]" />
        <Shimmer className="h-32 rounded-3xl sm:rounded-[var(--radius-card)] lg:col-span-2" />
      </div>
    </div>
  );
}

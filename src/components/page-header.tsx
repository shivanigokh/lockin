import { cn } from "@/lib/utils";

export function PageHeader({
  label,
  title,
  sub,
  children,
  className,
}: {
  label?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {label ? <p className="label-mono mb-2 text-lime">{label}</p> : null}
        <h1 className="display break-words text-4xl sm:text-5xl">{title}</h1>
        {sub ? <p className="mt-2 max-w-xl text-sm text-muted">{sub}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10", className)}>{children}</div>;
}

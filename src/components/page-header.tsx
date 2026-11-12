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
    <div className={cn("mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4", className)}>
      <div className="min-w-0">
        {label ? <p className="label-mono mb-2 hidden text-lime sm:block">{label}</p> : null}
        <h1 className="display wrap-text text-3xl sm:text-5xl">{title}</h1>
        {sub ? <p className="mt-2 hidden max-w-xl text-sm text-muted sm:block">{sub}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:py-10", className)}>{children}</div>;
}

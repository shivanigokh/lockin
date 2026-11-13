import { cn } from "@/lib/utils";

export function Empty({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-line px-6 py-10 text-center", className)}>
      <p className="font-display text-xl font-semibold tracking-tight">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

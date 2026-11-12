import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-5", className)} {...props} />;
}

export function CardHeader({
  label,
  title,
  action,
  className,
}: {
  label?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {label ? <div className="label-mono mb-1">{label}</div> : null}
        {title ? <h2 className="text-lg font-bold leading-tight">{title}</h2> : null}
      </div>
      {action}
    </div>
  );
}

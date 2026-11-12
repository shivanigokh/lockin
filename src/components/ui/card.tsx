import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-4 sm:p-5", className)} {...props} />;
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
    <div className={cn("mb-3 flex items-start justify-between gap-3 sm:mb-4", className)}>
      <div className="min-w-0">
        {label ? <div className="label-mono mb-1">{label}</div> : null}
        {title ? <h2 className="wrap-text text-base font-bold leading-tight sm:text-lg">{title}</h2> : null}
      </div>
      {action}
    </div>
  );
}

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "pink";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-b from-[#a9abff] to-[#8689f5] text-[#141218] shadow-[0_8px_24px_-10px_rgba(117,121,224,0.9),inset_0_1px_0_rgba(255,255,255,0.45)] hover:brightness-105 active:scale-[0.98]",
  secondary: "bg-white/[0.08] text-ink border border-white/10 backdrop-blur-xl hover:bg-white/[0.12] active:scale-[0.98]",
  ghost: "text-muted hover:text-ink hover:bg-white/[0.07]",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
  pink: "bg-gradient-to-b from-[#ff8a78] to-[#e94b3c] text-white hover:brightness-105 active:scale-[0.98]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-full gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-full gap-2",
  lg: "h-[52px] px-6 text-[16px] rounded-full gap-2",
  icon: "h-10 w-10 rounded-full",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-150 cursor-pointer",
    variants[variant],
    sizes[size],
    className,
  );
}

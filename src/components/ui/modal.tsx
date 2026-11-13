"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-[32px] border border-white/10 bg-sheet/90 p-0 text-ink shadow-2xl backdrop-blur-3xl backdrop:bg-black/50 backdrop:backdrop-blur-md sm:m-auto sm:max-w-lg sm:rounded-[32px]",
        className,
      )}
    >
      {open ? (
        <div className="max-h-[90dvh] overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 animate-rise">
          <div className="mx-auto -mt-2 mb-3 h-1.5 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden />
          <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
            <div>
              {label ? <div className="label-mono mb-1 hidden sm:block">{label}</div> : null}
              <h2 className="display text-xl sm:text-2xl">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-muted transition hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

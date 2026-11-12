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
        "m-0 mt-auto w-full max-w-none rounded-t-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-3xl",
        className,
      )}
    >
      {open ? (
        <div className="max-h-[90dvh] overflow-y-auto p-5 sm:p-6 animate-rise">
          <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
            <div>
              {label ? <div className="label-mono mb-1 hidden sm:block">{label}</div> : null}
              <h2 className="display text-xl sm:text-2xl">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

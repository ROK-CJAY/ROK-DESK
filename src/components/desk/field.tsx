import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg",
        "focus-visible:ring-ring/60 focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

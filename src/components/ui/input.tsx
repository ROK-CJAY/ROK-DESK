import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

function Input({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-fg",
        "placeholder:text-subtle transition-[border-color,box-shadow] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

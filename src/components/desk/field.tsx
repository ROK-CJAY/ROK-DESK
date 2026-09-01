import { Children, cloneElement, isValidElement, type ReactNode } from "react";
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

function regroupMagicOptions(children: ReactNode): ReactNode {
  const list = Children.toArray(children);
  const magic: React.ReactElement[] = [];
  const rest: ReactNode[] = [];
  for (const child of list) {
    if (isValidElement(child) && child.type === "option") {
      const value = (child.props as { value?: string }).value;
      if (value === "mtg" || value === "mtg-commander") {
        magic.push(child);
        continue;
      }
    }
    rest.push(child);
  }
  if (magic.length === 0) return children;

  const items = [...magic]
    .sort((a, b) => {
      const av = (a.props as { value?: string }).value;
      const bv = (b.props as { value?: string }).value;
      if (av === bv) return 0;
      return av === "mtg" ? -1 : 1;
    })
    .map((el) => {
      const value = (el.props as { value?: string }).value;
      return cloneElement(el, undefined, value === "mtg-commander" ? "Commander" : "Constructed");
    });

  const before: ReactNode[] = [];
  const after: ReactNode[] = [];
  let optgroupsDone = false;
  for (const child of rest) {
    if (isValidElement(child) && child.type === "optgroup" && !optgroupsDone) {
      before.push(child);
      continue;
    }
    if (isValidElement(child) && child.type === "optgroup") {
      before.push(child);
      continue;
    }
    if (before.some((row) => isValidElement(row) && row.type === "optgroup")) {
      optgroupsDone = true;
      after.push(child);
    } else {
      before.push(child);
    }
  }

  return (
    <>
      {before}
      <optgroup label="Magic: The Gathering">{items}</optgroup>
      {after}
    </>
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-fg",
        "focus-visible:ring-ring/60 focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {regroupMagicOptions(children)}
    </select>
  );
}

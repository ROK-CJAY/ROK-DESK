import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command } from "cmdk";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

export type CatalogOption = {
  value: string;
  label: string;
  hint?: string;
};

export function CatalogSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  allowCustom = true,
  limit = 80,
}: {
  value: string;
  onChange: (value: string) => void;
  options: CatalogOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => filterOptions(options, query, limit), [options, query, limit]);
  const selected = options.find((option) => option.value.toLowerCase() === value.trim().toLowerCase());

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          data-qa="catalog-select"
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm",
            "focus-visible:ring-ring/60 focus-visible:ring-2 focus-visible:outline-none",
            value ? "text-fg" : "text-subtle",
          )}
        >
          <span className="min-w-0 truncate">{selected?.label || value || placeholder}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false} label={placeholder} className="flex flex-col">
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            autoFocus
            className="h-10 w-full border-b border-border bg-transparent px-3 text-sm text-fg outline-none placeholder:text-subtle"
          />
          <Command.List className="max-h-72 overflow-y-auto p-1">
            {results.map((option) => {
              const active = option.value.toLowerCase() === value.trim().toLowerCase();
              return (
                <Command.Item
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm",
                    "data-[selected=true]:bg-surface-2",
                    active && "text-fg",
                  )}
                >
                  <Check className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.hint ? <span className="shrink-0 text-xs text-muted">{option.hint}</span> : null}
                </Command.Item>
              );
            })}
            {results.length === 0 ? (
              allowCustom && query.trim() ? (
                <Command.Item
                  value={query.trim()}
                  onSelect={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                  className="cursor-pointer rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface-2"
                >
                  Use “{query.trim()}”
                </Command.Item>
              ) : (
                <Command.Empty className="px-3 py-4 text-center text-sm text-muted">{emptyText}</Command.Empty>
              )
            ) : null}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function filterOptions(options: CatalogOption[], query: string, limit = 80): CatalogOption[] {
  const key = query.trim().toLowerCase();
  if (!key) return options.slice(0, limit);
  const starts: CatalogOption[] = [];
  const contains: CatalogOption[] = [];
  for (const option of options) {
    const label = option.label.toLowerCase();
    const hint = option.hint?.toLowerCase() ?? "";
    if (label === key) starts.unshift(option);
    else if (label.startsWith(key)) starts.push(option);
    else if (label.includes(key) || hint.includes(key)) contains.push(option);
  }
  return [...starts, ...contains].slice(0, limit);
}

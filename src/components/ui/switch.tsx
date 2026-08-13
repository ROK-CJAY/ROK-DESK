import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-border bg-surface-2 transition-colors duration-150",
        "data-[state=checked]:bg-accent data-[state=checked]:border-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-muted transition-transform duration-150",
          "data-[state=checked]:translate-x-4 data-[state=checked]:bg-accent-fg",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

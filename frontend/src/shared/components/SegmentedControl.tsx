import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { SPRING } from "@/shared/motion/springs";

export type SegmentedItem<TValue extends string> = {
  value: TValue;
  label: ReactNode;
};

type SegmentedControlProps<TValue extends string> = {
  /** Currently selected value. Radix does not expose its own, so it is passed in. */
  value: TValue;
  items: readonly SegmentedItem<TValue>[];
  /** Unique per control on the page: it ties the sliding pill to this group. */
  layoutId: string;
  label: string;
  className?: string;
};

/**
 * A segmented control whose selection indicator slides between items.
 *
 * Must be rendered inside a `<Tabs>` root, which owns the value and the panels.
 * Built on the Radix primitives so roles and roving-tabindex keyboard
 * navigation come for free; only the indicator is ours.
 */
export function SegmentedControl<TValue extends string>({
  value,
  items,
  layoutId,
  label,
  className,
}: SegmentedControlProps<TValue>) {
  return (
    <TabsPrimitive.List
      aria-label={label}
      className={cn(
        "bg-muted/70 inline-flex items-center gap-0.5 rounded-full p-1",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "text-muted-foreground relative isolate inline-flex h-7 items-center justify-center gap-1.5",
              "rounded-full px-3.5 text-caption font-medium whitespace-nowrap",
              "transition-colors duration-150 outline-none",
              "hover:text-foreground data-[state=active]:text-foreground",
              "focus-visible:ring-ring focus-visible:ring-[3px]",
              "[&_svg]:size-3.5 [&_svg]:shrink-0",
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING.snappy}
                aria-hidden="true"
                className="bg-surface-raised elevated absolute inset-0 -z-10 rounded-full"
              />
            )}
            {item.label}
          </TabsPrimitive.Trigger>
        );
      })}
    </TabsPrimitive.List>
  );
}

import {type VariantProps, cva} from "class-variance-authority";
import {View} from "react-native";
import * as Slot from "@/components/primitives/slot";
import type {SlottableViewProps} from "@/components/primitives/types";
import {TextClassContext} from "@/components/ui/text";
import {cn} from "@/lib/utils";

const badgeVariants = cva(
  "web:inline-flex items-center rounded-full border border-surface1 px-2.5 py-0.5 web:transition-colors web:focus:outline-none web:focus:ring-2 web:focus:ring-lavender web:focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-lavender web:hover:opacity-80 active:opacity-80",
        secondary:
          "border-transparent bg-surface1 web:hover:opacity-80 active:opacity-80",
        destructive:
          "border-transparent bg-red web:hover:opacity-80 active:opacity-80",
        outline: "text-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const badgeTextVariants = cva("text-xs font-semibold ", {
  variants: {
    variant: {
      default: "text-crust",
      secondary: "text-text",
      destructive: "text-crust",
      outline: "text-text",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = SlottableViewProps & VariantProps<typeof badgeVariants>;

function Badge({className, variant, asChild, ...props}: BadgeProps) {
  const Component = asChild ? Slot.View : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({variant})}>
      <Component
        className={cn(badgeVariants({variant}), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export {Badge, badgeTextVariants, badgeVariants};
export type {BadgeProps};

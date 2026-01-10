import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { Text as RNText } from "react-native";
import * as Slot from "@/components/primitives/slot";
import type {
  SlottableTextProps,
  TextRef,
} from "@/components/primitives/types";
import { cn } from "@/lib/utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

/*
 * Typography Scale (Figma → App):
 * - pageTitle:     33px → 28px
 * - cardTitle:     18px → 16px
 * - button:        17px → 14px
 * - body:          15px → 12px
 * - sectionTitle:  13px → 11px (uppercase)
 * - caption:       13px → 11px
 * - subtitle:      11px → 10px
 * - tag:           9px  → 9px
 */
const textVariants = cva("text-foreground web:select-text", {
  variants: {
    variant: {
      default: "text-base",
      pageTitle: "text-[28px] font-bold",
      cardTitle: "text-[16px] font-bold leading-tight",
      button: "text-[14px] font-semibold",
      body: "text-[12px] font-semibold",
      sectionTitle: "text-[11px] font-bold uppercase",
      caption: "text-[11px] font-medium",
      subtitle: "text-[10px] font-semibold",
      tag: "text-[9px] font-bold uppercase",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type TextProps = SlottableTextProps & VariantProps<typeof textVariants>;

const Text = React.forwardRef<TextRef, TextProps>(
  ({ className, asChild = false, variant, ...props }, ref) => {
    const textClass = React.useContext(TextClassContext);
    const Component = asChild ? Slot.Text : RNText;
    return (
      <Component
        className={cn(textVariants({ variant }), textClass, className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Text.displayName = "Text";

export { Text, TextClassContext, textVariants };
export type { TextProps };

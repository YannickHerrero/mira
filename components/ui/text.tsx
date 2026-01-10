import {type VariantProps, cva} from "class-variance-authority";
import * as React from "react";
import {Text as RNText} from "react-native";
import * as Slot from "@/components/primitives/slot";
import type {
  SlottableTextProps,
  TextRef,
} from "@/components/primitives/types";
import {cn} from "@/lib/utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

/*
 * Typography Scale (Figma → App):
 * - pageTitle:     33px → 25px
 * - cardTitle:     18px → 14px
 * - button:        17px → 13px
 * - body:          15px → 11px
 * - sectionTitle:  13px → 10px (uppercase)
 * - caption:       13px → 10px
 * - subtitle:      11px → 8px
 * - tag:           9px  → 7px
 */
const textVariants = cva("text-foreground web:select-text", {
  variants: {
    variant: {
      default: "text-base",
      pageTitle: "text-[25px] font-bold",
      cardTitle: "text-[14px] font-bold leading-tight",
      button: "text-[13px] font-semibold",
      body: "text-[11px] font-semibold",
      sectionTitle: "text-[10px] font-bold uppercase",
      caption: "text-[10px] font-medium",
      subtitle: "text-[8px] font-semibold",
      tag: "text-[7px] font-bold uppercase",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type TextProps = SlottableTextProps & VariantProps<typeof textVariants>;

const Text = React.forwardRef<TextRef, TextProps>(
  ({className, asChild = false, variant, ...props}, ref) => {
    const textClass = React.useContext(TextClassContext);
    const Component = asChild ? Slot.Text : RNText;
    return (
      <Component
        className={cn(textVariants({variant}), textClass, className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Text.displayName = "Text";

export {Text, TextClassContext, textVariants};
export type {TextProps};

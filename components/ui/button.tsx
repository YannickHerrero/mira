import {type VariantProps, cva} from "class-variance-authority";
import * as React from "react";
import {Pressable} from "react-native";
import {TextClassContext} from "@/components/ui/text";
import {cn} from "@/lib/utils";

const buttonVariants = cva(
  "group flex items-center justify-center rounded-md web:ring-offset-base web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-lavender web:focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-lavender web:hover:opacity-90 active:opacity-90",
        destructive: "bg-red web:hover:opacity-90 active:opacity-90",
        outline:
          "border border-surface1 bg-base web:hover:bg-mauve web:hover:text-crust active:bg-mauve",
        secondary: "bg-surface1 web:hover:opacity-80 active:opacity-80",
        ghost: "web:hover:bg-mauve web:hover:text-crust active:bg-mauve",
        link: "web:underline-offset-4 web:hover:underline web:focus:underline ",
      },
      size: {
        default: "h-10 px-4 py-2 native:h-12 native:px-5 native:py-3",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 native:h-14",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const buttonTextVariants = cva(
  "web:whitespace-nowrap text-sm native:text-base font-medium text-text web:transition-colors",
  {
    variants: {
      variant: {
        default: "text-crust",
        destructive: "text-crust",
        outline: "group-active:text-crust",
        secondary: "text-text group-active:text-text",
        ghost: "text-text group-active:text-crust",
        link: "text-lavender group-active:underline",
      },
      size: {
        default: "",
        sm: "",
        lg: "native:text-lg",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(({className, variant, size, ...props}, ref) => {
  return (
    <TextClassContext.Provider
      value={cn(
        props.disabled && "web:pointer-events-none",
        buttonTextVariants({variant, size}),
      )}
    >
      <Pressable
        className={cn(
          props.disabled && "opacity-50 web:pointer-events-none",
          buttonVariants({variant, size, className}),
        )}
        ref={ref}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
});
Button.displayName = "Button";

export {Button, buttonTextVariants, buttonVariants};
export type {ButtonProps};

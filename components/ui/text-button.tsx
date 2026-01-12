import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const textButtonVariants = cva("", {
  variants: {
    textVariant: {
      default: "",
      outline: "text-subtext0",
      strong: "font-semibold",
      base: "text-base",
      baseStrong: "text-base font-semibold",
      xl: "text-xl",
      xlStrong: "text-xl font-semibold",
    },
  },
  defaultVariants: {
    textVariant: "default",
  },
});

type TextButtonProps = Omit<ButtonProps, "children"> &
  VariantProps<typeof textButtonVariants> & {
    label: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    loading?: boolean;
    loadingColor?: string;
    contentClassName?: string;
  };

const TextButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  TextButtonProps
>(
  (
    {
      label,
      leftIcon,
      rightIcon,
      loading = false,
      loadingColor,
      contentClassName,
      textVariant,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <Button ref={ref} disabled={disabled || loading} {...props}>
        <View
          className={cn(
            "flex-row items-center justify-center gap-2",
            contentClassName,
          )}
        >
          {loading ? (
            <ActivityIndicator size="small" color={loadingColor} />
          ) : (
            <>
              {leftIcon ? <View className="shrink-0">{leftIcon}</View> : null}
              <Text className={textButtonVariants({ textVariant })}>
                {label}
              </Text>
              {rightIcon ? <View className="shrink-0">{rightIcon}</View> : null}
            </>
          )}
        </View>
      </Button>
    );
  },
);
TextButton.displayName = "TextButton";

export { TextButton };
export type { TextButtonProps };

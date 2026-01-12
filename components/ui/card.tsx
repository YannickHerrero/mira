import * as React from "react";
import {Text, View} from "react-native";
import type {TextRef, ViewRef} from "@/components/primitives/types";
import {TextClassContext} from "@/components/ui/text";
import {cn} from "@/lib/utils";

const Card = React.forwardRef<
  ViewRef,
  React.ComponentPropsWithoutRef<typeof View>
>(({className, ...props}, ref) => (
  <View
    ref={ref}
    className={cn(
      "rounded-lg border border-surface1 bg-surface0 shadow-sm shadow-text/10",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  ViewRef,
  React.ComponentPropsWithoutRef<typeof View>
>(({className, ...props}, ref) => (
  <View
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  TextRef,
  React.ComponentPropsWithoutRef<typeof Text>
>(({className, ...props}, ref) => (
  <Text
    role="heading"
    aria-level={3}
    ref={ref}
    className={cn(
      "text-2xl text-text font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  TextRef,
  React.ComponentPropsWithoutRef<typeof Text>
>(({className, ...props}, ref) => (
  <Text
    ref={ref}
    className={cn("text-sm text-subtext0", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  ViewRef,
  React.ComponentPropsWithoutRef<typeof View>
>(({className, ...props}, ref) => (
  <TextClassContext.Provider value="text-text">
    <View ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  </TextClassContext.Provider>
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  ViewRef,
  React.ComponentPropsWithoutRef<typeof View>
>(({className, ...props}, ref) => (
  <View
    ref={ref}
    className={cn("flex flex-row items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};

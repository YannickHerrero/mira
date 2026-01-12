import type {
  BottomSheetBackdropProps,
  BottomSheetFooterProps as GBottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetFlatList as GBottomSheetFlatList,
  BottomSheetFooter as GBottomSheetFooter,
  BottomSheetTextInput as GBottomSheetTextInput,
  BottomSheetView as GBottomSheetView,
  useBottomSheetModal,
} from "@gorhom/bottom-sheet";
import type { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useTheme } from "@react-navigation/native";
import * as Slot from "../slot";
import * as React from "react";
import {
  type GestureResponderEvent,
  Keyboard,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { cn } from "@/lib/utils";

type BottomSheetRef = React.ElementRef<typeof View>;
type BottomSheetProps = React.ComponentPropsWithoutRef<typeof View>;

interface BottomSheetContext {
  sheetRef: React.RefObject<BottomSheetModal | null>;
}

const BottomSheetContext = React.createContext({} as BottomSheetContext);

const BottomSheet = React.forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ ...props }, ref) => {
    const sheetRef = React.useRef<BottomSheetModal>(null);

    return (
      <BottomSheetContext.Provider value={{ sheetRef: sheetRef }}>
        <View ref={ref} {...props} />
      </BottomSheetContext.Provider>
    );
  },
);

function useBottomSheetContext() {
  const context = React.useContext(BottomSheetContext);
  if (!context) {
    throw new Error(
      "BottomSheet compound components cannot be rendered outside the BottomSheet component",
    );
  }
  return context;
}

const CLOSED_INDEX = -1;

type BottomSheetContentRef = React.ElementRef<typeof BottomSheetModal>;

type BottomSheetContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof BottomSheetModal>,
  "backdropComponent"
> & {
  backdropProps?: Partial<
    React.ComponentPropsWithoutRef<typeof BottomSheetBackdrop>
  >;
};

const BottomSheetContent = React.forwardRef<
  BottomSheetContentRef,
  BottomSheetContentProps
>(
  (
    {
      enablePanDownToClose = true,
      enableDynamicSizing = true,
      index = 0,
      backdropProps,
      backgroundStyle,
      android_keyboardInputMode = "adjustResize",
      children,
      ...props
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const { isDarkColorScheme } = useColorScheme();
    const { colors } = useTheme();
    const { sheetRef } = useBottomSheetContext();

    React.useImperativeHandle(ref, () => {
      if (!sheetRef.current) {
        return {} as BottomSheetModalMethods;
      }
      return sheetRef.current;
    }, [sheetRef.current]);

    const renderBackdrop = React.useCallback(
      (props: BottomSheetBackdropProps) => {
        const {
          pressBehavior = "close",
          opacity = 0.7,
          appearsOnIndex = 0,
          disappearsOnIndex = CLOSED_INDEX,
          style,
          onPress,
          ...rest
        } = {
          ...props,
          ...backdropProps,
        };
        return (
          <BottomSheetBackdrop
            opacity={opacity}
            appearsOnIndex={appearsOnIndex}
            disappearsOnIndex={disappearsOnIndex}
            pressBehavior={pressBehavior}
            style={style}
            onPress={() => {
              if (Keyboard.isVisible()) {
                Keyboard.dismiss();
              }
              onPress?.();
            }}
            {...rest}
          />
        );
      },
      [backdropProps],
    );

    // Wrap children in GBottomSheetView for proper dynamic sizing measurement
    const wrappedChildren = enableDynamicSizing ? (
      <GBottomSheetView style={{ paddingBottom: insets.bottom }}>
        {children as React.ReactNode}
      </GBottomSheetView>
    ) : (
      children
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={enableDynamicSizing}
        backgroundStyle={[
          { backgroundColor: colors.background },
          backgroundStyle,
        ]}
        handleIndicatorStyle={{
          backgroundColor: colors.border,
        }}
        topInset={insets.top}
        android_keyboardInputMode={android_keyboardInputMode}
        {...props}
      >
        {wrappedChildren}
      </BottomSheetModal>
    );
  },
);

const BottomSheetOpenTrigger = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  React.ComponentPropsWithoutRef<typeof Pressable> & {
    asChild?: boolean;
  }
>(({ onPress, asChild = false, ...props }, ref) => {
  const { sheetRef } = useBottomSheetContext();
  function handleOnPress(ev: GestureResponderEvent) {
    sheetRef.current?.present();
    onPress?.(ev);
  }
  const Trigger = asChild ? Slot.Pressable : Pressable;
  return <Trigger ref={ref} onPress={handleOnPress} {...props} />;
});

const BottomSheetCloseTrigger = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  React.ComponentPropsWithoutRef<typeof Pressable> & {
    asChild?: boolean;
  }
>(({ onPress, asChild = false, ...props }, ref) => {
  const { dismiss } = useBottomSheetModal();
  function handleOnPress(ev: GestureResponderEvent) {
    dismiss();
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    }
    onPress?.(ev);
  }
  const Trigger = asChild ? Slot.Pressable : Pressable;
  return <Trigger ref={ref} onPress={handleOnPress} {...props} />;
});

type BottomSheetViewProps = React.ComponentPropsWithoutRef<typeof View>;

function BottomSheetView({
  className,
  children,
  style,
  ...props
}: BottomSheetViewProps) {
  return (
    <View
      style={style}
      className={cn("px-4 pt-5 pb-6 bg-base", className)}
      {...props}
    >
      {children}
    </View>
  );
}

type BottomSheetTextInputRef = React.ElementRef<typeof GBottomSheetTextInput>;
type BottomSheetTextInputProps = React.ComponentPropsWithoutRef<
  typeof GBottomSheetTextInput
>;
const BottomSheetTextInput = React.forwardRef<
  BottomSheetTextInputRef,
  BottomSheetTextInputProps
>(({ className, placeholderClassName, ...props }, ref) => {
  return (
    <GBottomSheetTextInput
      ref={ref}
      className={cn(
        "rounded-md border border-surface1 bg-base px-3 text-xl h-14 leading-[1.25] text-text items-center  placeholder:text-subtext0 disabled:opacity-50",
        className,
      )}
      placeholderClassName={cn("text-subtext0", placeholderClassName)}
      {...props}
    />
  );
});

type BottomSheetFlatListRef = React.ElementRef<typeof GBottomSheetFlatList>;
type BottomSheetFlatListProps = React.ComponentPropsWithoutRef<
  typeof GBottomSheetFlatList
>;
const BottomSheetFlatList = React.forwardRef<
  BottomSheetFlatListRef,
  BottomSheetFlatListProps
>(({ className, ...props }, ref) => {
  const insets = useSafeAreaInsets();
  return (
    <GBottomSheetFlatList
      ref={ref}
      contentContainerStyle={[{ paddingBottom: insets.bottom }]}
      className={cn("px-4 pt-5 pb-6", className)}
      keyboardShouldPersistTaps="handled"
      {...props}
    />
  );
});

type BottomSheetHeaderRef = React.ElementRef<typeof View>;
type BottomSheetHeaderProps = React.ComponentPropsWithoutRef<typeof View>;
const BottomSheetHeader = React.forwardRef<
  BottomSheetHeaderRef,
  BottomSheetHeaderProps
>(({ className, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn(
        "border-b border-surface1/40 flex-row items-center justify-between px-4 pb-4 bg-base",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
});

type BottomSheetActionRowRef = React.ElementRef<typeof Pressable>;
type BottomSheetActionRowProps = React.ComponentPropsWithoutRef<
  typeof Pressable
> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
  layout?: "card" | "grouped";
};

const BottomSheetActionRow = React.forwardRef<
  BottomSheetActionRowRef,
  BottomSheetActionRowProps
>(
  (
    {
      title,
      description,
      icon,
      variant = "default",
      layout = "card",
      className,
      ...props
    },
    ref,
  ) => {
    const isDestructive = variant === "destructive";
    const isGrouped = layout === "grouped";
    return (
      <Pressable
        ref={ref}
        className={cn(
          "flex-row items-center gap-3 active:opacity-70",
          isGrouped
            ? "px-4 py-4 border-b border-surface1/50 last:border-b-0"
            : "rounded-xl px-3 py-3",
          !isGrouped && (isDestructive ? "bg-red/10" : "bg-surface0/20"),
          className,
        )}
        {...props}
      >
        {icon ? (
          <View
            className={cn(
              "items-center justify-center",
              isGrouped ? "h-6 w-6" : "h-10 w-10 rounded-full",
              !isGrouped &&
              (isDestructive ? "bg-red/20" : "bg-surface0/40"),
            )}
          >
            {icon}
          </View>
        ) : null}
        <View className="flex-1">
          <Text
            className={cn(
              "text-base font-medium",
              isDestructive ? "text-red" : "text-text",
            )}
          >
            {title}
          </Text>
          {description ? (
            <Text className="text-xs text-subtext0 mt-0.5">
              {description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  },
);

BottomSheetActionRow.displayName = "BottomSheetActionRow";

type BottomSheetActionGroupRef = React.ElementRef<typeof View>;
type BottomSheetActionGroupProps = React.ComponentPropsWithoutRef<typeof View>;

const BottomSheetActionGroup = React.forwardRef<
  BottomSheetActionGroupRef,
  BottomSheetActionGroupProps
>(({ className, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn("bg-surface0/20 rounded-2xl overflow-hidden", className)}
      {...props}
    />
  );
});

BottomSheetActionGroup.displayName = "BottomSheetActionGroup";

type BottomSheetFooterRef = React.ElementRef<typeof View>;

type BottomSheetFooterProps = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  "style"
> & {
  bottomSheetFooterProps: GBottomSheetFooterProps;
  children?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * To be used in a useCallback function as a props to BottomSheetContent
 */
const BottomSheetFooter = React.forwardRef<
  BottomSheetFooterRef,
  BottomSheetFooterProps
>(({ bottomSheetFooterProps, children, className, style, ...props }, ref) => {
  const insets = useSafeAreaInsets();
  return (
    <GBottomSheetFooter {...bottomSheetFooterProps}>
      <View
        ref={ref}
        style={[{ paddingBottom: insets.bottom + 6 }, style]}
        className={cn("px-4 pt-1.5", className)}
        {...props}
      >
        {children}
      </View>
    </GBottomSheetFooter>
  );
});

function useBottomSheet() {
  const ref = React.useRef<BottomSheetContentRef>(null);

  const open = React.useCallback(() => {
    ref.current?.present();
  }, []);

  const close = React.useCallback(() => {
    ref.current?.dismiss();
  }, []);

  return { ref, open, close };
}

export {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetActionGroup,
  BottomSheetActionRow,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheet,
};

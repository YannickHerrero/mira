import * as React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { TextButton } from "@/components/ui/text-button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={cn(
        "flex-1 items-center justify-center px-6 py-12",
        className
      )}
    >
      <View className="mb-4">{icon}</View>

      <Text className="text-xl font-semibold text-text text-center">
        {title}
      </Text>

      {description && (
        <Text className="text-subtext0 mt-2 text-center max-w-[280px]">
          {description}
        </Text>
      )}

      {action && (
        <TextButton
          variant="secondary"
          onPress={action.onPress}
          className="mt-6"
          label={action.label}
        />
      )}
    </View>
  );
}

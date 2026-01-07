import * as React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, WifiOff } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  variant?: "default" | "network" | "inline";
  className?: string;
}

export function ErrorState({
  title,
  message,
  error,
  onRetry,
  isRetrying = false,
  variant = "default",
  className,
}: ErrorStateProps) {
  // Determine if it's a network error
  const isNetworkError =
    variant === "network" ||
    (error instanceof Error &&
      (error.message.includes("network") ||
        error.message.includes("Network") ||
        error.message.includes("fetch")));

  const Icon = isNetworkError ? WifiOff : AlertCircle;

  const displayTitle =
    title ?? (isNetworkError ? "No Connection" : "Something went wrong");

  const displayMessage =
    message ??
    (error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : isNetworkError
          ? "Please check your internet connection and try again"
          : "An unexpected error occurred. Please try again.");

  if (variant === "inline") {
    return (
      <View
        className={cn(
          "flex-row items-center bg-destructive/10 rounded-lg px-4 py-3",
          className
        )}
      >
        <AlertCircle size={18} className="text-destructive mr-3" />
        <Text className="flex-1 text-sm text-destructive">{displayMessage}</Text>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onPress={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw
              size={16}
              className={cn(
                "text-destructive",
                isRetrying && "animate-spin"
              )}
            />
          </Button>
        )}
      </View>
    );
  }

  return (
    <View
      className={cn(
        "flex-1 items-center justify-center px-6 py-12",
        className
      )}
    >
      <View className="bg-destructive/10 rounded-full p-4 mb-4">
        <Icon size={32} className="text-destructive" />
      </View>

      <Text className="text-xl font-semibold text-foreground text-center">
        {displayTitle}
      </Text>

      <Text className="text-muted-foreground mt-2 text-center max-w-[280px]">
        {displayMessage}
      </Text>

      {onRetry && (
        <Button
          variant="outline"
          onPress={onRetry}
          disabled={isRetrying}
          className="mt-6"
        >
          <View className="flex-row items-center">
            <RefreshCw
              size={16}
              className={cn(
                "mr-2 text-foreground",
                isRetrying && "animate-spin"
              )}
            />
            <Text>{isRetrying ? "Retrying..." : "Try Again"}</Text>
          </View>
        </Button>
      )}
    </View>
  );
}

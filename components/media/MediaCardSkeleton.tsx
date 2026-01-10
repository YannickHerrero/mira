import * as React from "react";
import { View, useWindowDimensions } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaCardSkeletonProps {
  size?: "small" | "medium" | "large";
  /** When true, skeleton fills container width with 2:3 aspect ratio */
  fillWidth?: boolean;
}

const SIZES = {
  small: { width: 100, height: 150 },
  medium: { width: 130, height: 195 },
  large: { width: 160, height: 240 },
};

export function MediaCardSkeleton({ size = "medium", fillWidth = false }: MediaCardSkeletonProps) {
  const { width, height } = SIZES[size];

  if (fillWidth) {
    return (
      <View style={{ width: "100%" }}>
        {/* Poster skeleton */}
        <View style={{ width: "100%", aspectRatio: 2 / 3 }}>
          <Skeleton className="flex-1 rounded-lg" />
        </View>

        {/* Title skeleton */}
        <View style={{ width: "90%", height: 16 }} className="mt-2">
          <Skeleton className="flex-1 rounded" />
        </View>

        {/* Year skeleton */}
        <View style={{ width: 48, height: 12 }} className="mt-1.5">
          <Skeleton className="flex-1 rounded" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ width }}>
      {/* Poster skeleton */}
      <View style={{ width, height }}>
        <Skeleton className="flex-1 rounded-lg" />
      </View>

      {/* Title skeleton */}
      <View style={{ width: width * 0.9, height: 16 }} className="mt-2">
        <Skeleton className="flex-1 rounded" />
      </View>

      {/* Year skeleton */}
      <View style={{ width: 48, height: 12 }} className="mt-1.5">
        <Skeleton className="flex-1 rounded" />
      </View>
    </View>
  );
}

interface MediaGridSkeletonProps {
  count?: number;
  size?: "small" | "medium" | "large";
}

const GAP = 12;

export function MediaGridSkeleton({
  count = 6,
  size = "medium",
}: MediaGridSkeletonProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = SIZES[size].width;
  const numColumns = Math.max(2, Math.floor((screenWidth - 32) / (cardWidth + GAP)));

  return (
    <View
      className="flex-row flex-wrap px-4"
      style={{ marginHorizontal: -GAP / 2 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ padding: GAP / 2 }}>
          <MediaCardSkeleton size={size} />
        </View>
      ))}
    </View>
  );
}

export function MediaSectionSkeleton() {
  return (
    <View className="mb-6">
      {/* Title skeleton */}
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Skeleton className="h-6 w-32 rounded" />
      </View>

      {/* Cards row skeleton */}
      <View className="flex-row px-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <MediaCardSkeleton key={i} size="medium" />
        ))}
      </View>
    </View>
  );
}

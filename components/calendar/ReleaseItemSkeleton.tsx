import * as React from "react";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

export function ReleaseItemSkeleton() {
  return (
    <View className="flex-row bg-surface0 rounded-lg border border-surface1 p-3 mb-3">
      {/* Poster skeleton */}
      <Skeleton className="w-16 h-24 rounded-md mr-3" />

      {/* Info skeleton */}
      <View className="flex-1 justify-center">
        {/* Title */}
        <Skeleton className="h-4 w-3/4 mb-2 rounded" />
        
        {/* Episode info */}
        <Skeleton className="h-3 w-1/2 mb-3 rounded" />

        {/* Badge area */}
        <View className="flex-row items-center gap-2">
          <Skeleton className="h-5 w-10 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </View>
      </View>
    </View>
  );
}

export function CalendarSkeleton() {
  return (
    <View className="px-4 pt-4">
      {/* First day section */}
      <Skeleton className="h-4 w-32 mb-3 rounded" />
      <ReleaseItemSkeleton />
      <ReleaseItemSkeleton />
      
      {/* Second day section */}
      <View className="pt-4">
        <Skeleton className="h-4 w-28 mb-3 rounded" />
        <ReleaseItemSkeleton />
      </View>
      
      {/* Third day section */}
      <View className="pt-4">
        <Skeleton className="h-4 w-36 mb-3 rounded" />
        <ReleaseItemSkeleton />
        <ReleaseItemSkeleton />
      </View>
    </View>
  );
}

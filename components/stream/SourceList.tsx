import * as React from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { SourceCard } from "./SourceCard";
import type { Stream } from "@/lib/types";

interface SourceListProps {
  streams: Stream[];
  isLoading: boolean;
  error: string | null;
  onSelectStream: (stream: Stream) => void;
}

export function SourceList({
  streams,
  isLoading,
  error,
  onSelectStream,
}: SourceListProps) {
  const renderItem = React.useCallback(
    ({ item }: { item: Stream }) => (
      <SourceCard stream={item} onPress={() => onSelectStream(item)} />
    ),
    [onSelectStream]
  );

  const keyExtractor = React.useCallback(
    (item: Stream, index: number) => `${item.provider}-${item.title}-${index}`,
    []
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-4">Loading sources...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-6">
        <Text className="text-destructive text-center">{error}</Text>
      </View>
    );
  }

  if (streams.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-6">
        <Text className="text-muted-foreground text-center">
          No sources found for this title.
        </Text>
        <Text className="text-muted-foreground text-center text-sm mt-2">
          Try a different quality or check back later.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={streams}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <Text className="text-sm text-muted-foreground mb-3">
          {streams.length} source{streams.length !== 1 ? "s" : ""} found
        </Text>
      }
    />
  );
}

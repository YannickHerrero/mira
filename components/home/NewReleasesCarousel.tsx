import * as React from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { SectionHeader } from "./SectionHeader";
import { NewReleaseCard } from "./NewReleaseCard";
import type { UpcomingRelease } from "@/lib/api/tmdb";

interface NewReleasesCarouselProps {
  releases: UpcomingRelease[];
}

export function NewReleasesCarousel({ releases }: NewReleasesCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Card takes ~90% of screen width with some padding
  const cardWidth = screenWidth - 32; // 16px padding on each side
  const snapInterval = cardWidth + 8; // card width + gap

  if (releases.length === 0) {
    return null;
  }

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / snapInterval);
    setActiveIndex(index);
  };

  return (
    <View>
      <SectionHeader title="New releases" />

      <FlatList
        data={releases}
        keyExtractor={(item) => `${item.media.id}-${item.releaseDate}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <NewReleaseCard release={item} cardWidth={cardWidth} />
        )}
      />

      {/* Page indicator dots */}
      {releases.length > 1 && (
        <View className="flex-row items-center justify-center mt-3 gap-1.5">
          {releases.map((_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full ${
                index === activeIndex ? "w-4 bg-lavender" : "w-1.5 bg-foreground/30"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

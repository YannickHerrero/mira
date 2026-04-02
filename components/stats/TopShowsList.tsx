import { View, Image } from "react-native";
import { Text } from "@/components/ui/text";
import { Tv } from "@/lib/icons";
import { getPosterUrl } from "@/lib/types";
import { useTranslation } from "react-i18next";

interface TopShowsListProps {
  data: {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    count: number;
  }[];
}

export function TopShowsList({ data }: TopShowsListProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3">
      {data.map((show, index) => {
        const posterUrl = getPosterUrl(show.posterPath, "small");
        return (
          <View key={show.tmdbId} className="flex-row items-center gap-3">
            <Text variant="cardTitle" className="text-subtext0 w-5 text-center">
              {index + 1}
            </Text>
            <View className="w-10 h-[60px] rounded-md overflow-hidden bg-surface0/30 items-center justify-center">
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Tv size={16} className="text-subtext0" />
              )}
            </View>
            <View className="flex-1">
              <Text variant="body" className="text-text" numberOfLines={1}>
                {show.title}
              </Text>
              <Text variant="caption" className="text-subtext0">
                {t("watchStats.episodes", { count: show.count })}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

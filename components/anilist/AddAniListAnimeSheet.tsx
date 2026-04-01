import * as React from "react";
import { View, Pressable, ActivityIndicator, Image } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import {
  BottomSheetContent,
  BottomSheetView,
  BottomSheetHeader,
  BottomSheetTextInput,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Text } from "@/components/ui/text";
import { Muted } from "@/components/ui/typography";
import { useAniListStore } from "@/stores/anilist";
import {
  type AniListSearchResult,
  createAniListClient,
} from "@/lib/api/anilist";
import { lightImpact } from "@/lib/haptics";
import { BottomSheetFlatList } from "@/components/primitives/bottomSheet/bottom-sheet.native";

interface AddAniListAnimeSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onAnimeAdded: () => void;
}

export function AddAniListAnimeSheet({
  sheetRef,
  onAnimeAdded,
}: AddAniListAnimeSheetProps) {
  const { dismiss } = useBottomSheetModal();
  const { t } = useTranslation();
  const { accessToken } = useAniListStore();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<AniListSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
    setError(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const client = createAniListClient(null);
        const results = await client.searchMedia({ search: query.trim() });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleSelect = React.useCallback(
    async (entry: AniListSearchResult) => {
      if (!accessToken || isAdding !== null) return;

      lightImpact();
      setIsAdding(entry.id);
      setError(null);

      try {
        const client = createAniListClient(accessToken);
        await client.saveProgress({
          mediaId: entry.id,
          progress: 0,
          status: "CURRENT",
        });
        onAnimeAdded();
        dismiss();
      } catch {
        setError(t("library.anilistAddFailed"));
      } finally {
        setIsAdding(null);
      }
    },
    [accessToken, isAdding, onAnimeAdded, dismiss, t]
  );

  const handleSheetChange = React.useCallback((index: number) => {
    if (index === -1) {
      setSearchQuery("");
      setSearchResults([]);
      setError(null);
      setIsSearching(false);
    }
  }, []);

  const renderItem = React.useCallback(
    ({ item: entry }: { item: AniListSearchResult }) => {
      const entryTitle =
        entry.title.english ?? entry.title.romaji ?? entry.title.native ?? "Untitled";
      const entryMeta = [
        entry.format,
        entry.seasonYear ? String(entry.seasonYear) : null,
        entry.episodes ? `${entry.episodes} ep` : null,
      ]
        .filter(Boolean)
        .join(" \u2022 ");

      const adding = isAdding === entry.id;

      return (
        <Pressable
          onPress={() => handleSelect(entry)}
          disabled={isAdding !== null}
          className="flex-row items-center gap-3 rounded-xl p-3 bg-surface0/30 mb-2 active:opacity-70"
        >
          {entry.coverImage?.medium ? (
            <Image
              source={{ uri: entry.coverImage.medium }}
              className="h-16 w-12 rounded-md bg-surface1"
              resizeMode="cover"
            />
          ) : (
            <View className="h-16 w-12 rounded-md bg-surface1/40" />
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold text-text">{entryTitle}</Text>
            {entryMeta ? <Muted>{entryMeta}</Muted> : null}
          </View>
          {adding && <ActivityIndicator size="small" />}
        </Pressable>
      );
    },
    [isAdding, handleSelect]
  );

  return (
    <BottomSheetContent
      ref={sheetRef}
      enableDynamicSizing={false}
      snapPoints={["85%"]}
      onChange={handleSheetChange}
    >
      <BottomSheetHeader>
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-text">
            {t("library.anilistAddAnime")}
          </Text>
          <Text className="text-xs text-subtext0">
            {t("library.anilistAddAnimeDesc")}
          </Text>
        </View>
      </BottomSheetHeader>
      <BottomSheetView className="flex-1 px-4 pt-4 pb-0">
        <BottomSheetTextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder={t("library.anilistSearchPlaceholder")}
          returnKeyType="search"
          autoFocus
        />
        {error && (
          <Text className="text-sm text-red mt-2">{error}</Text>
        )}
      </BottomSheetView>
      {isSearching ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="small" />
        </View>
      ) : searchResults.length > 0 ? (
        <BottomSheetFlatList
          data={searchResults}
          keyExtractor={(item: AniListSearchResult) => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      ) : searchQuery.trim() ? (
        <View className="py-8 items-center">
          <Muted>{t("media.noAniListResults")}</Muted>
        </View>
      ) : null}
    </BottomSheetContent>
  );
}

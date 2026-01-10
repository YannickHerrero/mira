import * as React from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Check, Star } from "@/lib/icons";
import { sortLanguagesByPopularity } from "@/lib/language-utils";
import type { Stream } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGUAGE_DISPLAY_LIMIT = 4;

interface SourceCardProps {
  stream: Stream;
  onPress: () => void;
  onLongPress?: () => void;
  downloadStatus?: "downloading" | "completed" | "pending" | null;
  downloadProgress?: number;
  isDownloadedSource?: boolean;
  isRecommended?: boolean;
  rawStreamName?: string; // To detect RD+ prefix
  preferredLanguages?: string[];
}

export function SourceCard({
  stream,
  onPress,
  onLongPress,
  downloadStatus,
  downloadProgress,
  isDownloadedSource,
  isRecommended,
  rawStreamName,
  preferredLanguages,
}: SourceCardProps) {
  // Check if this stream has RD+ (Real-Debrid cached)
  const hasRdPlus = rawStreamName?.includes("[RD+]") || stream.isCached;
  const showDownloadIndicator =
    Platform.OS !== "web" &&
    (downloadStatus === "downloading" || downloadStatus === "pending");
  const sortedLanguages = sortLanguagesByPopularity(stream.languages, preferredLanguages ?? []);
  const displayLanguages = sortedLanguages.slice(0, LANGUAGE_DISPLAY_LIMIT);
  const remainingLanguagesCount = sortedLanguages.length - displayLanguages.length;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className="bg-card rounded-lg p-4 mb-3 active:opacity-80 border border-border"
    >
      <View className="flex-row items-start justify-between">
        {/* Left side - main info */}
        <View className="flex-1">
           {/* Quality and badges row */}
           <View className="flex-row items-center flex-wrap gap-1.5">
             {stream.quality && (
               <Badge
                 variant="default"
                 className={cn(
                   "px-2 py-0.5",
                   stream.quality === "2160p" || stream.quality === "4K"
                     ? "bg-purple-600"
                     : stream.quality === "1080p"
                       ? "bg-blue-600"
                       : "bg-muted"
                 )}
               >
                 <Text className="text-xs font-bold text-white">
                   {stream.quality}
                 </Text>
               </Badge>
             )}

             {stream.hdr && (
               <Badge variant="secondary" className="px-2 py-0.5 bg-amber-600">
                 <Text className="text-xs font-medium text-white">{stream.hdr}</Text>
               </Badge>
             )}

             {stream.videoCodec && (
               <Badge variant="outline" className="px-2 py-0.5">
                 <Text className="text-xs text-muted-foreground">
                   {stream.videoCodec}
                 </Text>
               </Badge>
             )}

             {stream.audio && (
               <Badge variant="outline" className="px-2 py-0.5">
                 <Text className="text-xs text-muted-foreground">{stream.audio}</Text>
               </Badge>
             )}

             {stream.provider && (
               <Badge variant="outline" className="px-2 py-0.5">
                 <Text className="text-xs text-muted-foreground">{stream.provider}</Text>
               </Badge>
             )}

             {hasRdPlus && (
               <Badge variant="outline" className="px-2 py-0.5">
                 <Text className="text-xs text-muted-foreground">RD+</Text>
               </Badge>
             )}

             {isDownloadedSource && (
               <Badge variant="default" className="px-2 py-0.5 bg-green-600">
                 <Text className="text-xs font-medium text-white">Downloaded</Text>
               </Badge>
             )}

             {isRecommended && (
               <Badge variant="default" className="px-2 py-0.5 bg-amber-500">
                 <View className="flex-row items-center gap-1">
                   <Star size={10} className="text-white fill-white" />
                   <Text className="text-xs font-bold text-white">Recommended</Text>
                 </View>
               </Badge>
             )}
           </View>

          {/* Title */}
          <Text
            className="text-sm text-foreground mt-2"
            numberOfLines={2}
          >
            {stream.title}
          </Text>

           {/* Meta row */}
           <View className="flex-row items-center mt-2 gap-3">
             {stream.size && (
               <Text className="text-xs text-muted-foreground">{stream.size}</Text>
             )}

             {stream.seeders !== undefined && stream.seeders > 0 && (
               <Text className="text-xs text-muted-foreground">
                 {stream.seeders} seeders
               </Text>
             )}
           </View>

          {/* Languages */}
          {sortedLanguages.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mt-2">
              {displayLanguages.map((lang) => (
                <Text key={lang} className="text-xs text-muted-foreground">
                  {lang}
                </Text>
              ))}
              {remainingLanguagesCount > 0 && (
                <Text className="text-xs text-muted-foreground">
                  +{remainingLanguagesCount} more
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Right side - play button or download indicator */}
        <View className="ml-3">
          {isDownloadedSource ? (
            <View className="w-12 h-12 rounded-full bg-green-600 items-center justify-center">
              <Check size={20} className="text-white" />
            </View>
          ) : showDownloadIndicator ? (
            <View className="w-12 h-12 rounded-full bg-muted items-center justify-center relative">
              <Download size={20} className="text-foreground" />
              {downloadStatus === "downloading" && downloadProgress !== undefined && (
                <View
                  className="absolute bottom-0 left-0 right-0 h-1 bg-primary/30 rounded-full overflow-hidden"
                >
                  <View
                    className="h-full bg-primary"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </View>
              )}
            </View>
          ) : downloadStatus === "completed" ? (
            <View className="w-12 h-12 rounded-full bg-muted items-center justify-center">
              <Play size={20} className="text-muted-foreground ml-0.5" fill="currentColor" />
            </View>
          ) : (
            <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
              <Play size={20} className="text-primary-foreground ml-0.5" fill="currentColor" />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

import * as React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Text } from "@/components/ui/text";
import { H4 } from "@/components/ui/typography";
import ListItem from "@/components/ui/list-item";
import { Check } from "@/lib/icons/Check";
import { Globe, Smartphone } from "@/lib/icons";
import { useLanguage, type SupportedLanguage } from "@/hooks/useLanguage";

type LanguageValue = SupportedLanguage | "system";

type ItemData = {
  title: string;
  subtitle: string;
  value: LanguageValue;
  icon: React.ReactNode;
};

type ItemProps = {
  item: ItemData;
  onPress: () => void;
  selected: boolean;
};

function LanguageItemRow({ item, onPress, selected }: ItemProps) {
  return (
    <Pressable className="py-4" onPress={onPress}>
      <View className="flex flex-row justify-between">
        <View className="pr-4 pt-1">{item.icon}</View>
        <View className="flex-1">
          <H4>{item.title}</H4>
          <Text className="text-sm text-subtext0">{item.subtitle}</Text>
        </View>
        <View>{selected && <Check className="text-crust" />}</View>
      </View>
    </Pressable>
  );
}

interface LanguageSettingItemProps {
  className?: string;
}

export function LanguageSettingItem({ className }: LanguageSettingItemProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { dismiss } = useBottomSheetModal();

  const languages: ItemData[] = React.useMemo(
    () => [
      {
        title: t("language.systemDefault"),
        subtitle: t("theme.deviceSettingsDesc"),
        value: "system" as const,
        icon: <Smartphone className="text-text" />,
      },
      {
        title: t("language.english"),
        subtitle: "English",
        value: "en" as const,
        icon: <Globe className="text-text" />,
      },
      {
        title: t("language.french"),
        subtitle: "Français",
        value: "fr" as const,
        icon: <Globe className="text-text" />,
      },
      {
        title: t("language.spanish"),
        subtitle: "Español",
        value: "es" as const,
        icon: <Globe className="text-text" />,
      },
      {
        title: t("language.german"),
        subtitle: "Deutsch",
        value: "de" as const,
        icon: <Globe className="text-text" />,
      },
      {
        title: t("language.italian"),
        subtitle: "Italiano",
        value: "it" as const,
        icon: <Globe className="text-text" />,
      },
      {
        title: t("language.portuguese"),
        subtitle: "Português",
        value: "pt" as const,
        icon: <Globe className="text-text" />,
      },
    ],
    [t]
  );

  const getDisplayText = () => {
    if (language === "system") return t("language.systemDefault");
    const langItem = languages.find((l) => l.value === language);
    return langItem?.subtitle || t("language.english");
  };

  const onSelect = React.useCallback(
    (value: LanguageValue) => {
      setLanguage(value);
      dismiss();
    },
    [setLanguage, dismiss]
  );

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <ListItem
          itemLeft={(props) => <Globe {...props} />}
          label={t("settings.language")}
          description={getDisplayText()}
          className={className}
        />
      </BottomSheetOpenTrigger>
      <BottomSheetContent>
        <BottomSheetHeader>
          <Text className="text-text text-xl font-bold pb-1">
            {t("language.select")}
          </Text>
        </BottomSheetHeader>
        <BottomSheetView className="gap-3">
          {languages.map((lang) => (
            <LanguageItemRow
              key={lang.value}
              item={lang}
              onPress={() => onSelect(lang.value)}
              selected={lang.value === language}
            />
          ))}
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
}

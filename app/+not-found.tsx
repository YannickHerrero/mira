import {Link, Stack} from "expo-router";
import {View} from "react-native";
import { useTranslation } from "react-i18next";
import {Text} from "@/components/ui";

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{title: t("notFound.title")}} />
      <View>
        <Text>{t("notFound.message")}</Text>

        <Link href="/">
          <Text>{t("notFound.goHome")}</Text>
        </Link>
      </View>
    </>
  );
}

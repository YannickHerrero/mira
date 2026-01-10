import {BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetOpenTrigger, BottomSheetView} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import ListItem from "@/components/ui/list-item";
import {Text} from "@/components/ui/text";
import {Palette} from "@/lib/icons";

type ThemeSettingItemProps = {
  className?: string;
};

export const ThemeSettingItem = ({ className }: ThemeSettingItemProps) => {
  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <ListItem
          itemLeft={(props) => <Palette {...props} />}
          label="Theme"
          className={className}
        />
      </BottomSheetOpenTrigger>
      <BottomSheetContent>
        <BottomSheetHeader>
          <Text className="text-foreground text-xl font-bold pb-1">Theme</Text>
        </BottomSheetHeader>
        <BottomSheetView className="gap-2">
          <Text className="text-sm text-muted-foreground">Coming soon.</Text>
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
};

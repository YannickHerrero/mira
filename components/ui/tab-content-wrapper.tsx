import * as React from "react";
import { View, StyleSheet } from "react-native";
import { useDeviceLayout, SIDEBAR_WIDTH } from "@/hooks/useDeviceLayout";

interface TabContentWrapperProps {
  children: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Wrapper component that adds left padding when the sidebar is visible (iPad landscape).
 * Use this to wrap the content of each tab screen to prevent content from being
 * hidden behind the sidebar navigation.
 */
export function TabContentWrapper({ children, className }: TabContentWrapperProps) {
  const { isTabletLandscape } = useDeviceLayout();

  return (
    <View
      style={[
        styles.container,
        isTabletLandscape && { paddingLeft: SIDEBAR_WIDTH },
      ]}
      className={className}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Breakpoint for tablet devices (iPad) */
export const TABLET_BREAKPOINT = 768;

/** Approximate height of one content row (section title + horizontal card list) */
export const CONTENT_ROW_HEIGHT = 260;

/**
 * Hook to detect if the device is a tablet in landscape mode.
 * Returns layout information useful for responsive design.
 */
export function useDeviceLayout() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = screenWidth > screenHeight;
  const isTablet = Math.max(screenWidth, screenHeight) >= TABLET_BREAKPOINT;
  const isTabletLandscape = isTablet && isLandscape;

  // Available height after accounting for safe area insets
  const availableHeight = screenHeight - insets.top - insets.bottom;

  return {
    screenWidth,
    screenHeight,
    availableHeight,
    isLandscape,
    isTablet,
    isTabletLandscape,
    insets,
  };
}

/**
 * Hook to get the maximum height for a hero section.
 * On tablet landscape, caps the height to leave room for at least one content row.
 * On other devices/orientations, returns the provided default height.
 */
export function useHeroMaxHeight(defaultHeight: number) {
  const { availableHeight, isTabletLandscape } = useDeviceLayout();

  if (isTabletLandscape) {
    // Leave room for at least one content row below the hero
    const maxHeight = availableHeight - CONTENT_ROW_HEIGHT;
    return Math.min(defaultHeight, maxHeight);
  }

  return defaultHeight;
}

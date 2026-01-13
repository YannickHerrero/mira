# iOS Widget Feature - Current Status

## Overview

Adding an iOS widget to display recent/upcoming releases from the user's watchlist.

## Current State: Ready to Build

The widget implementation is complete and configured. The last step is to clear the cached EAS credentials and rebuild.

## The Issue

EAS Build was failing with:
```
Provisioning profile "*[expo] com.yherrero.mira.MiraWidgets AdHoc ..." doesn't support the group.com.yherrero.mira App Group.
```

**Root Cause**: EAS created a provisioning profile for the widget extension but didn't include the App Groups capability because it wasn't explicitly declared in the config.

**Fix Applied**: Added explicit `appExtensions` configuration in `app.config.ts`:
```typescript
extra: {
  eas: {
    build: {
      experimental: {
        ios: {
          appExtensions: [
            {
              targetName: "MiraWidgets",
              bundleIdentifier: "com.yherrero.mira.MiraWidgets",
              entitlements: {
                "com.apple.security.application-groups": ["group.com.yherrero.mira"],
              },
            },
          ],
        },
      },
    },
  },
},
```

## Steps to Complete

### 1. Clear Widget Credentials

```bash
eas credentials --platform ios
```

1. Select **development** (or whichever profile you're building)
2. Select **MiraWidgets** (`com.yherrero.mira.MiraWidgets`)
3. Select **Provisioning Profile** → **Remove provisioning profile**

### 2. Build

```bash
eas build -p ios -e development
```

EAS will create a new provisioning profile with App Groups capability.

### 3. Test the Widget

1. Install the build on your iPhone
2. Open Mira app and go to Home (triggers recent releases export) and Calendar (triggers upcoming releases export)
3. Long-press home screen → Tap **+** → Search **"Mira"**
4. Add widget (small, medium, or large)
5. Long-press widget → **Edit Widget** → Choose between "Recent Releases" and "Upcoming Releases"

## Files Created/Modified

### New Files
- `widgets/` - Swift widget extension files
  - `MiraWidget.swift` - Main widget entry point
  - `TimelineProvider.swift` - Data loading from App Groups
  - `ReleaseEntry.swift` - Data models
  - `WidgetViews.swift` - SwiftUI views for all sizes
  - `ConfigurationIntent.swift` - User configuration (recent vs upcoming)
  - `Info.plist` - Widget extension info
  - `Module.swift`, `Attributes.swift` - Required placeholders

- `lib/widget/` - React Native widget integration
  - `index.ts` - Export functions for recent/upcoming releases
  - `types.ts` - TypeScript types

- `plugins/widget/app.plugin.js` - Config plugin for native bridge

### Modified Files
- `app.config.ts` - Added widget plugins and EAS extension config
- `hooks/useRecentReleases.ts` - Exports data to widget
- `hooks/useUpcomingReleases.ts` - Exports data to widget
- `package.json` - Added `react-native-widget-extension`

## Widget Features

- **Three sizes**: Small (1 item), Medium (3 items), Large (5 items)
- **Configurable**: User can choose "Recent Releases" or "Upcoming Releases"
- **Deep linking**: Tap any release to open its detail page in the app
- **Empty states**: "All caught up!" for recent, "No upcoming releases" for upcoming
- **Dark theme**: Matches app colors

## Dependencies Added

- `react-native-widget-extension` - Handles Xcode project setup for widget extension

## Architecture

```
Main App (React Native)
    │
    ├── useRecentReleases → exportRecentReleasesToWidget()
    │                              │
    ├── useUpcomingReleases → exportUpcomingReleasesToWidget()
    │                              │
    └── MiraWidgetBridge ──────────┴──→ App Group UserDefaults
                                              │
                                              ▼
                                   iOS Widget Extension (Swift)
                                              │
                                   TimelineProvider reads data
                                              │
                                   SwiftUI Views display releases
```

## Troubleshooting

If you still get provisioning errors:

1. **Verify App Group exists** in Apple Developer Portal:
   - Go to Certificates, Identifiers & Profiles → Identifiers → App Groups
   - Check `group.com.yherrero.mira` exists

2. **Verify both bundle IDs have App Groups enabled**:
   - `com.yherrero.mira` (main app)
   - `com.yherrero.mira.MiraWidgets` (widget extension)

3. **Clear all credentials and rebuild**:
   ```bash
   eas build -p ios -e development --clear-credentials
   ```

4. **Check config is correct**:
   ```bash
   npx expo config --type public | grep -A 20 appExtensions
   ```

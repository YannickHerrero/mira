# Mira Android Widget Plugin

Expo config plugin for adding Android widgets to the Mira app using Jetpack Glance.

## Features

- **MiraWidget**: Responsive widget supporting small (2x2), medium (4x2), and large (4x4) sizes
- **MiraLibraryWidget**: Large-only widget with multiple layout options (List, Grid, Featured, Cards)
- Display modes: Recent Releases or Upcoming Releases
- Native Material Design configuration activity
- Catppuccin Macchiato theme matching iOS widgets

## Installation

The plugin is automatically included when you run `npx expo prebuild`.

## Configuration

The plugin is registered in `app.config.ts`:

```typescript
plugins: [
  // ... other plugins
  "./plugins/android-widget",
]
```

## How It Works

1. **Prebuild**: During `expo prebuild`, the plugin:
   - Copies Kotlin source files to `android/app/src/main/java/<package>/widget/`
   - Copies resource files (XML layouts, colors, strings) to `android/app/src/main/res/`
   - Modifies `AndroidManifest.xml` to register widget receivers and config activity
   - Modifies `build.gradle` to add Jetpack Glance dependencies
   - Registers the native module in `MainApplication.kt`

2. **Data Flow**:
   - React Native app exports release data via `lib/widget/index.ts`
   - Data is stored in SharedPreferences via the `WidgetDataModule` native module
   - Widgets read from SharedPreferences and render using Jetpack Glance

3. **Widget Update**:
   - When data is exported, widgets are automatically triggered to update
   - Widgets also refresh every 30 minutes via the system

## Widget Sizes

### MiraWidget
- **Small (2x2)**: Shows single featured release
- **Medium (4x2)**: Shows up to 3 releases in a list
- **Large (4x4)**: Shows up to 6 releases with poster thumbnails

### MiraLibraryWidget (Large only)
- **List**: Detailed list with poster thumbnails
- **Grid**: Netflix-style 4x2 poster grid
- **Featured**: Hero card + small poster grid
- **Cards**: Horizontal cards with full details

## Files Structure

```
plugins/android-widget/
├── index.js                 # Plugin entry point
├── withAndroidWidget.js     # Config plugin logic
├── package.json
├── res/                     # Android resources
│   ├── drawable/           # Drawable resources
│   ├── layout/             # XML layouts
│   ├── values/             # Colors, strings, styles
│   └── xml/                # Widget metadata
└── src/                     # Kotlin source files
    ├── data/               # Data models and providers
    │   ├── WidgetModels.kt
    │   └── WidgetDataProvider.kt
    ├── theme/              # Theme definitions
    │   ├── WidgetTheme.kt
    │   └── GlanceColorScheme.kt
    ├── ui/                 # UI components
    │   ├── CommonComponents.kt
    │   ├── SmallWidgetContent.kt
    │   ├── MediumWidgetContent.kt
    │   ├── LargeListContent.kt
    │   ├── LargeGridContent.kt
    │   ├── LargeFeaturedContent.kt
    │   └── LargeCardsContent.kt
    ├── MiraWidget.kt        # Main widget
    ├── MiraWidgetReceiver.kt
    ├── MiraLibraryWidget.kt # Library widget
    ├── MiraLibraryWidgetReceiver.kt
    ├── WidgetConfigActivity.kt
    ├── WidgetDataModule.kt  # Native module
    └── WidgetDataPackage.kt
```

## Theme Colors (Catppuccin Macchiato)

| Color | Hex | Usage |
|-------|-----|-------|
| Base | #24273A | Widget background |
| Surface | #363A4F | Cards, elevated surfaces |
| Text | #CAD3F5 | Primary text |
| Subtext | #A5ADCB | Secondary text |
| Accent | #B7BDF8 | Lavender, highlights |
| Badge Movie | #F5A97F | Peach, movie badges |
| Badge TV | #8AADF4 | Blue, TV badges |

## Development

To test changes:

1. Make changes to files in `plugins/android-widget/`
2. Run `npx expo prebuild --clean` to regenerate the Android project
3. Run `npx expo run:android` to build and run

## Troubleshooting

### Widget not appearing in widget picker
- Ensure the app has been installed at least once
- Try restarting the device/emulator

### Widget shows "Loading..."
- Open the main app to ensure data is exported
- Check logcat for any errors from `[AndroidWidget]`

### Images not loading
- Ensure posters are cached via `cachePosterImage()` in `lib/widget/poster-cache.ts`
- Check that the posters directory exists in app's files directory

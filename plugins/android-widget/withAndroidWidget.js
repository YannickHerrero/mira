const {
  withAndroidManifest,
  withDangerousMod,
  withPlugins,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Copies all Kotlin source files from the plugin's src directory
 * to the Android project's source directory.
 */
function copyKotlinSources(projectRoot, packageName) {
  const pluginSrcDir = path.join(__dirname, "src");
  const packagePath = packageName.replace(/\./g, "/");
  const androidSrcDir = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    packagePath,
    "widget"
  );

  // Create the destination directory if it doesn't exist
  fs.mkdirSync(androidSrcDir, { recursive: true });

  // Copy all .kt files from plugin src to android src
  if (fs.existsSync(pluginSrcDir)) {
    copyDirectoryRecursive(pluginSrcDir, androidSrcDir, packageName);
  }
}

/**
 * Recursively copies a directory, processing Kotlin files to replace package placeholders.
 */
function copyDirectoryRecursive(src, dest, packageName) {
  if (!fs.existsSync(src)) return;

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectoryRecursive(srcPath, destPath, packageName);
    } else if (entry.name.endsWith(".kt")) {
      let content = fs.readFileSync(srcPath, "utf8");
      // Replace package placeholder with actual package name
      content = content.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
      fs.writeFileSync(destPath, content);
    }
  }
}

/**
 * Copies resource files (XML layouts, drawables, etc.) to the Android res directory.
 */
function copyResources(projectRoot) {
  const pluginResDir = path.join(__dirname, "res");
  const androidResDir = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "res"
  );

  if (fs.existsSync(pluginResDir)) {
    copyResourcesRecursive(pluginResDir, androidResDir);
  }
}

/**
 * Recursively copies resource files, creating directories as needed.
 */
function copyResourcesRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyResourcesRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Modifies the AndroidManifest.xml to add widget receivers and configuration activity.
 */
function withWidgetManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Add MiraWidget receiver
    const miraWidgetReceiver = {
      $: {
        "android:name": ".widget.MiraWidgetReceiver",
        "android:exported": "true",
        "android:label": "Mira Releases",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/mira_widget_info",
          },
        },
      ],
    };

    // Add MiraLibraryWidget receiver
    const miraLibraryWidgetReceiver = {
      $: {
        "android:name": ".widget.MiraLibraryWidgetReceiver",
        "android:exported": "true",
        "android:label": "Mira Library",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/mira_library_widget_info",
          },
        },
      ],
    };

    // Add Widget Configuration Activity
    const widgetConfigActivity = {
      $: {
        "android:name": ".widget.WidgetConfigActivity",
        "android:exported": "true",
        "android:theme": "@style/Theme.Mira.WidgetConfig",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.appwidget.action.APPWIDGET_CONFIGURE",
              },
            },
          ],
        },
      ],
    };

    // Initialize receiver array if it doesn't exist
    if (!application.receiver) {
      application.receiver = [];
    }

    // Initialize activity array if it doesn't exist
    if (!application.activity) {
      application.activity = [];
    }

    // Add receivers and activity (avoid duplicates)
    const hasWidgetReceiver = application.receiver.some(
      (r) => r.$["android:name"] === ".widget.MiraWidgetReceiver"
    );
    if (!hasWidgetReceiver) {
      application.receiver.push(miraWidgetReceiver);
    }

    const hasLibraryReceiver = application.receiver.some(
      (r) => r.$["android:name"] === ".widget.MiraLibraryWidgetReceiver"
    );
    if (!hasLibraryReceiver) {
      application.receiver.push(miraLibraryWidgetReceiver);
    }

    const hasConfigActivity = application.activity.some(
      (a) => a.$["android:name"] === ".widget.WidgetConfigActivity"
    );
    if (!hasConfigActivity) {
      application.activity.push(widgetConfigActivity);
    }

    return config;
  });
}

/**
 * Adds dangerous modifications to copy source files during prebuild.
 */
function withWidgetSourceFiles(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packageName = config.android?.package || "com.yherrero.mira";

      // Copy Kotlin source files
      copyKotlinSources(projectRoot, packageName);

      // Copy resource files
      copyResources(projectRoot);

      return config;
    },
  ]);
}

/**
 * Main plugin function that applies all widget-related modifications.
 */
function withAndroidWidget(config, props = {}) {
  return withPlugins(config, [
    withWidgetSourceFiles,
    withWidgetManifest,
  ]);
}

module.exports = { withAndroidWidget };

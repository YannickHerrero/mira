const {
  withDangerousMod,
  withPlugins,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Copies Kotlin source files from the plugin's src directory
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
    "downloads"
  );

  fs.mkdirSync(androidSrcDir, { recursive: true });

  if (fs.existsSync(pluginSrcDir)) {
    const entries = fs.readdirSync(pluginSrcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.endsWith(".kt")) {
        const srcPath = path.join(pluginSrcDir, entry.name);
        const destPath = path.join(androidSrcDir, entry.name);
        let content = fs.readFileSync(srcPath, "utf8");
        content = content.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
        fs.writeFileSync(destPath, content);
      }
    }
  }
}

/**
 * Registers the DownloadsCopyPackage in MainApplication.kt.
 */
function registerNativePackage(projectRoot, packageName) {
  const packagePath = packageName.replace(/\./g, "/");
  const mainApplicationPath = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    packagePath,
    "MainApplication.kt"
  );

  if (!fs.existsSync(mainApplicationPath)) {
    console.warn("[AndroidDownloads] MainApplication.kt not found, skipping package registration");
    return;
  }

  let content = fs.readFileSync(mainApplicationPath, "utf8");

  const importStatement = `import ${packageName}.downloads.DownloadsCopyPackage`;
  if (!content.includes(importStatement)) {
    const importRegex = /^import .+$/gm;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match;
    }
    if (lastImportMatch) {
      const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPosition) + "\n" + importStatement + content.slice(insertPosition);
    }
  }

  const packageRegistration = "DownloadsCopyPackage()";
  if (!content.includes(packageRegistration)) {
    const addPattern = /packages\.add\([^)]+\)/;
    if (addPattern.test(content)) {
      content = content.replace(
        addPattern,
        (match) => `${match}\n              packages.add(${packageRegistration})`
      );
    } else {
      const applyPattern = /(\.apply\s*\{[^}]*)(})/;
      if (applyPattern.test(content)) {
        content = content.replace(
          applyPattern,
          (_, before, after) => `${before}\n              add(${packageRegistration})\n            ${after}`
        );
      }
    }
  }

  fs.writeFileSync(mainApplicationPath, content);
  console.log("[AndroidDownloads] Registered DownloadsCopyPackage in MainApplication.kt");
}

/**
 * Copies source files during prebuild.
 */
function withDownloadsSourceFiles(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packageName = config.android?.package || "com.yherrero.mira";

      copyKotlinSources(projectRoot, packageName);
      registerNativePackage(projectRoot, packageName);

      return config;
    },
  ]);
}

/**
 * Main plugin function.
 */
function withAndroidDownloads(config, props = {}) {
  return withPlugins(config, [
    withDownloadsSourceFiles,
  ]);
}

module.exports = { withAndroidDownloads };

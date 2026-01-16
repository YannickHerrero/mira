/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "MiraWidget",
  displayName: "Mira Releases",
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  icon: "../../assets/images/icon.png",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.yherrero.mira"],
  },
  colors: {
    $widgetBackground: { color: "#24273a", darkColor: "#24273a" },
    $accent: { color: "#b7bdf8", darkColor: "#b7bdf8" },
  },
});

package {{PACKAGE_NAME}}.widget.theme

import androidx.glance.unit.ColorProvider

/**
 * Glance-compatible color providers for the Catppuccin Macchiato theme.
 * These can be used directly in GlanceModifier.background() and TextStyle.
 */
object GlanceColors {
    // Create color providers for day and night (we use the same colors)
    val background = ColorProvider(WidgetTheme.colors.background)
    val surface = ColorProvider(WidgetTheme.colors.surface)
    val overlay = ColorProvider(WidgetTheme.colors.overlay)
    
    val text = ColorProvider(WidgetTheme.colors.text)
    val subtext = ColorProvider(WidgetTheme.colors.subtext)
    val subtextDim = ColorProvider(WidgetTheme.colors.subtextDim)
    
    val accent = ColorProvider(WidgetTheme.colors.accent)
    val accentSecondary = ColorProvider(WidgetTheme.colors.accentSecondary)
    
    val success = ColorProvider(WidgetTheme.colors.success)
    val warning = ColorProvider(WidgetTheme.colors.warning)
    val error = ColorProvider(WidgetTheme.colors.error)
    
    val badgeMovie = ColorProvider(WidgetTheme.colors.badgeMovie)
    val badgeTv = ColorProvider(WidgetTheme.colors.badgeTv)
    
    val cardBackground = ColorProvider(WidgetTheme.colors.cardBackground)
}

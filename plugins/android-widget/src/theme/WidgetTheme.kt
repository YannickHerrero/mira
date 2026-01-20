package {{PACKAGE_NAME}}.widget.theme

import androidx.compose.ui.graphics.Color

/**
 * Catppuccin Macchiato color theme for Mira widgets.
 * Provides consistent colors across all widget layouts.
 */
object WidgetTheme {
    val colors = WidgetColors()
}

/**
 * Widget color palette based on Catppuccin Macchiato theme.
 */
class WidgetColors {
    // Base colors
    val background = Color(0xFF24273A)
    val surface = Color(0xFF363A4F)
    val overlay = Color(0xFF494D64)
    
    // Text colors
    val text = Color(0xFFCAD3F5)
    val subtext = Color(0xFFA5ADCB)
    val subtextDim = Color(0xFF8087A2)
    
    // Accent colors
    val accent = Color(0xFFB7BDF8)      // Lavender
    val accentSecondary = Color(0xFF8AADF4) // Blue
    
    // Status colors
    val success = Color(0xFFA6DA95)     // Green
    val warning = Color(0xFFEED49F)     // Yellow
    val error = Color(0xFFED8796)       // Red
    
    // Media type badge colors
    val badgeMovie = Color(0xFFF5A97F)  // Peach
    val badgeTv = Color(0xFF8AADF4)     // Blue
    
    // Card colors
    val cardBackground = Color(0xFF363A4F)
}

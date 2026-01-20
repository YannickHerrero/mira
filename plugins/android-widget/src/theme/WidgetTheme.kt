package {{PACKAGE_NAME}}.widget.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.TextUnit

/**
 * Catppuccin Macchiato color theme for Mira widgets.
 * Provides consistent colors, typography, and dimensions across all widget layouts.
 * 
 * This theme matches the iOS widget theme defined in widgets.swift for visual consistency.
 */
object WidgetTheme {
    val colors = WidgetColors()
    val typography = WidgetTypography()
    val dimensions = WidgetDimensions()
}

/**
 * Widget color palette based on Catppuccin Macchiato theme.
 * 
 * Color reference:
 * - Base colors: Background surfaces from darkest to lightest
 * - Text colors: Text hierarchy from primary to tertiary
 * - Accent colors: Highlight and interactive elements
 * - Status colors: Success, warning, error states
 * - Badge colors: Media type indicators
 */
class WidgetColors {
    // Base colors (Catppuccin Macchiato)
    val base = Color(0xFF24273A)           // Darkest background
    val mantle = Color(0xFF1E2030)         // Darker than base
    val crust = Color(0xFF181926)          // Darkest
    val background = Color(0xFF24273A)     // Main widget background
    val surface = Color(0xFF363A4F)        // Cards, elevated surfaces (surface0)
    val surface1 = Color(0xFF494D64)       // Higher elevation
    val surface2 = Color(0xFF5B6078)       // Highest elevation
    val overlay = Color(0xFF494D64)        // Overlays, modals
    
    // Text colors
    val text = Color(0xFFCAD3F5)           // Primary text
    val subtext = Color(0xFFA5ADCB)        // Secondary text (subtext0)
    val subtext1 = Color(0xFFB8C0E0)       // Slightly brighter secondary
    val subtextDim = Color(0xFF8087A2)     // Tertiary/dimmed text
    val overlay0 = Color(0xFF6E738D)       // Very dimmed text
    
    // Accent colors
    val accent = Color(0xFFB7BDF8)         // Lavender - primary accent
    val accentSecondary = Color(0xFF8AADF4) // Blue - secondary accent
    val mauve = Color(0xFFC6A0F6)          // Purple accent
    
    // Status colors
    val success = Color(0xFFA6DA95)        // Green
    val warning = Color(0xFFEED49F)        // Yellow
    val error = Color(0xFFED8796)          // Red
    
    // Media type badge colors
    val badgeMovie = Color(0xFFF5A97F)     // Peach - for movie badges
    val badgeTv = Color(0xFF8AADF4)        // Blue - for TV badges
    
    // Card colors
    val cardBackground = Color(0xFF363A4F) // Same as surface
    
    /**
     * Get color with alpha
     */
    fun withAlpha(color: Color, alpha: Float): Color {
        return color.copy(alpha = alpha)
    }
}

/**
 * Widget typography settings.
 * Font sizes are optimized for widget display at various densities.
 */
class WidgetTypography {
    // Font sizes (matching iOS widget)
    val largeTitle: TextUnit = 20.sp      // Hero titles
    val title: TextUnit = 16.sp           // Section titles
    val body: TextUnit = 14.sp            // Standard body text
    val caption: TextUnit = 12.sp         // Secondary info
    val small: TextUnit = 10.sp           // Tertiary info
    val badge: TextUnit = 10.sp           // Badge text
    val tiny: TextUnit = 8.sp             // Very small text
}

/**
 * Widget dimension constants.
 * Standard sizes for consistent layout across different widget types.
 */
class WidgetDimensions {
    // Padding
    val paddingSmall: Dp = 4.dp
    val paddingMedium: Dp = 8.dp
    val paddingLarge: Dp = 12.dp
    val paddingXLarge: Dp = 16.dp
    
    // Corner radius
    val radiusSmall: Dp = 4.dp
    val radiusMedium: Dp = 8.dp
    val radiusLarge: Dp = 12.dp
    val radiusXLarge: Dp = 16.dp
    
    // Poster sizes
    val posterSmallWidth: Dp = 24.dp
    val posterSmallHeight: Dp = 36.dp
    val posterMediumWidth: Dp = 32.dp
    val posterMediumHeight: Dp = 48.dp
    val posterLargeWidth: Dp = 45.dp
    val posterLargeHeight: Dp = 65.dp
    val posterHeroWidth: Dp = 80.dp
    val posterHeroHeight: Dp = 120.dp
    val posterGridWidth: Dp = 60.dp
    val posterGridHeight: Dp = 90.dp
    
    // Divider
    val dividerHeight: Dp = 1.dp
    
    // Spacing
    val itemSpacing: Dp = 8.dp
    val sectionSpacing: Dp = 16.dp
}

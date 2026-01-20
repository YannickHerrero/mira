package {{PACKAGE_NAME}}.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.glance.appwidget.cornerRadius
import {{PACKAGE_NAME}}.widget.theme.WidgetTheme

/**
 * Main content composable for MiraWidget.
 * This will be expanded in subsequent tasks.
 */
@Composable
fun WidgetContent(context: Context, glanceId: GlanceId) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(WidgetTheme.colors.background)
            .cornerRadius(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Mira Widget",
            style = TextStyle(color = ColorProvider(WidgetTheme.colors.text))
        )
    }
}

/**
 * Main content composable for MiraLibraryWidget.
 * This will be expanded in subsequent tasks.
 */
@Composable
fun LibraryWidgetContent(context: Context, glanceId: GlanceId) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(WidgetTheme.colors.background)
            .cornerRadius(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Mira Library Widget",
            style = TextStyle(color = ColorProvider(WidgetTheme.colors.text))
        )
    }
}

// Extension for dp units in Glance
private val Int.dp: androidx.compose.ui.unit.Dp
    get() = androidx.compose.ui.unit.Dp(this.toFloat())
